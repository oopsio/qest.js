import http from 'http';
import fs from 'fs';
import path from 'path';
import { h } from 'preact';
import { pathToFileURL } from 'url';

const clientDir = path.join(process.cwd(), 'dist/client');
const serverDir = path.join(process.cwd(), 'dist/server/pages');
const routeCache = new Map();

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

http
  .createServer(async (req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index';

    let staticPath = path.join(
      clientDir,
      url === '/index' ? 'index.html' : url
    );
    if (!path.extname(staticPath) && fs.existsSync(staticPath + '.html')) {
      staticPath += '.html';
    }

    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const ext = path.extname(staticPath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      return res.end(fs.readFileSync(staticPath));
    }

    try {
      let pagePath;
      if (routeCache.has(url)) {
        pagePath = routeCache.get(url);
      } else {
        pagePath = path.join(serverDir, `${url}.js`);
        if (!fs.existsSync(pagePath)) {
          pagePath = path.join(serverDir, '404.js');
        }
        routeCache.set(url, pagePath);
      }

      // Safely format the Windows file path for dynamic import
      const moduleUrl = pathToFileURL(pagePath).href;
      const PageModule = await import(moduleUrl);
      const Page = PageModule.default;

      const { render } = await import('preact-render-to-string');
      const html = render(h(Page, null));

      let cssLink = '';
      const cssPath = path.join(clientDir, `pages${url}.css`);
      if (fs.existsSync(cssPath)) {
        cssLink = `<link rel="stylesheet" href="/pages${url}.css">`;
      }

      const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SSR Page</title>
        ${cssLink}
      </head>
      <body>
        <div id="app">${html}</div>
        <script type="module">
          import Page from '/pages${url}.js';
          window.__PAGE_COMPONENT__ = Page;
        </script>
        <script type="module" src="/src/client.js"></script>
      </body>
      </html>
    `;

      res.writeHead(pagePath.includes('404.js') ? 404 : 200, {
        'Content-Type': 'text/html',
      });
      res.end(fullHtml);
    } catch (err) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  })
  .listen(3000, () => {
    console.log('Production server running on http://localhost:3000');
  });
