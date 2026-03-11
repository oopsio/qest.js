import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Our custom Vite plugin for SSR development
function miniHybridDevServer() {
  return {
    name: 'mini-hybrid-dev-server',
    configureServer(server) {
      // Inject custom middleware into Vite's dev server
      server.middlewares.use(async (req, res, next) => {
        let url = req.originalUrl.split('?')[0];

        // 1. Skip assets (Vite handles CSS, images, JS automatically)
        if (url.includes('.') && url !== '/index.html') {
          return next();
        }

        try {
          // 2. Read the raw index.html
          let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');

          // 3. Let Vite transform it (Crucial: This injects Vite's HMR client scripts!)
          template = await server.transformIndexHtml(url, template);

          // 4. Load the SSR entry point on-the-fly
          // ssrLoadModule automatically recompiles your JSX instantly on every request
          const { renderPage } = await server.ssrLoadModule(
            '/src/entry-server.jsx'
          );

          // 5. Render your Preact app
          const { html } = await renderPage(url);

          // 6. Inject and send back to the browser
          const finalHtml = template.replace('', html);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(finalHtml);
        } catch (e) {
          // If there's an error, Vite maps the stack trace back to your original source code
          server.ssrFixStacktrace(e);
          console.error(e.stack);
          res.statusCode = 500;
          res.end(e.stack);
        }
      });
    },
  };
}

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  plugins: [miniHybridDevServer()],
});
