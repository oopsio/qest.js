import http from 'http';
import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { h } from 'preact';
import { pathToFileURL } from 'url';

const routeCache = new Map();

async function startDevServer() {
  console.log('Starting dev server...');

  // 1. Compile server pages
  const ctxServer = await esbuild.context({
    entryPoints: ['pages/**/*.jsx'],
    outdir: '.cache/server/pages',
    format: 'esm',
    bundle: true, // Bundle the server files
    packages: 'external', // Keep node_modules external
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.css': 'empty' }, // Strip out CSS imports for Node.js
  });

  // 2. Compile client hydrator
  const ctxClient = await esbuild.context({
    entryPoints: ['src/client.jsx', 'pages/**/*.jsx'],
    outdir: '.cache/client',
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    splitting: true,
  });

  await ctxServer.watch();
  await ctxClient.watch();

  http
    .createServer(async (req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/index';

      if (url.startsWith('/.cache/client/')) {
        try {
          const filePath = path.join(process.cwd(), url);
          const content = await fs.readFile(filePath);
          const ext = path.extname(filePath);
          const mime = ext === '.css' ? 'text/css' : 'text/javascript';
          res.writeHead(200, { 'Content-Type': mime });
          return res.end(content);
        } catch {
          /* Fallthrough */
        }
      }

      try {
        let pagePath;
        if (routeCache.has(url)) {
          pagePath = routeCache.get(url);
        } else {
          pagePath = path.join(process.cwd(), `.cache/server/pages${url}.js`);
          try {
            await fs.access(pagePath);
          } catch {
            pagePath = path.join(process.cwd(), '.cache/server/pages/404.js');
          }
          routeCache.set(url, pagePath);
        }

        // Safely format the Windows file path for dynamic import
        const moduleUrl = pathToFileURL(pagePath);
        moduleUrl.searchParams.set('t', Date.now()); // Bypass cache
        const PageModule = await import(moduleUrl.href);
        const Page = PageModule.default;

        const { render } = await import('preact-render-to-string');
        const html = render(h(Page, null));

        const cssPath = `/.cache/client/pages${url}.css`;
        let cssLink = '';
        try {
          await fs.access(path.join(process.cwd(), cssPath));
          cssLink = `<link rel="stylesheet" href="${cssPath}">`;
        } catch {
          /* No CSS */
        }

        const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Dev Server</title>
          ${cssLink}
        </head>
        <body>
          <div id="app">${html}</div>
          <script type="module">
            import Page from '/.cache/client/pages${url}.js';
            window.__PAGE_COMPONENT__ = Page;
          </script>
          <script type="module" src="/.cache/client/src/client.js"></script>
        </body>
        </html>
      `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fullHtml);
      } catch (err) {
        res.writeHead(500);
        res.end(err.stack);
      }
    })
    .listen(3000, () => {
      console.log('Running on http://localhost:3000');
    });
}

startDevServer();
