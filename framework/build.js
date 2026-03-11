import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { h } from 'preact';
import { pathToFileURL } from 'url';

async function build() {
  console.log('Building framework...');

  await esbuild.build({
    entryPoints: ['pages/**/*.jsx', 'src/client.jsx'],
    outdir: 'dist/client',
    bundle: true,
    format: 'esm',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    splitting: true,
    minify: true,
  });

  await esbuild.build({
    entryPoints: ['pages/**/*.jsx'],
    outdir: 'dist/server/pages',
    format: 'esm',
    bundle: true, // Bundle the server files
    packages: 'external', // Keep node_modules external
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.css': 'empty' }, // Strip out CSS imports for Node.js
  });

  const { render } = await import('preact-render-to-string');
  const pagesDir = path.join(process.cwd(), 'dist/server/pages');
  const files = await fs.readdir(pagesDir);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;

    // Safely format the Windows file path for dynamic import
    const modulePath = pathToFileURL(path.join(pagesDir, file)).href;
    const PageModule = await import(modulePath);

    if (PageModule.prerender) {
      const Page = PageModule.default;
      const html = render(h(Page, null));
      const route = file.replace('.js', '');

      let cssLink = '';
      try {
        await fs.access(
          path.join(process.cwd(), `dist/client/pages/${route}.css`)
        );
        cssLink = `<link rel="stylesheet" href="/pages/${route}.css">`;
      } catch {
        /* Ignore */
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SSG Page</title>
          ${cssLink}
        </head>
        <body>
          <div id="app">${html}</div>
          <script type="module">
            import Page from '/pages/${file}';
            window.__PAGE_COMPONENT__ = Page;
          </script>
          <script type="module" src="/src/client.js"></script>
        </body>
        </html>
      `;

      const outPath = path.join(
        'dist/client',
        route === 'index' ? 'index.html' : `${route}.html`
      );
      await fs.writeFile(outPath, fullHtml);
      console.log(`[SSG] Pre-rendered: ${outPath}`);
    }
  }
}

build();
