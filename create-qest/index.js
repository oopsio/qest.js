#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { input } from '@inquirer/prompts';

async function scaffold() {
  // 1. Interactive Prompt for Project Name
  let projectName = process.argv[2];

  if (!projectName) {
    projectName = await input({
      message: 'What is the name of your new qest.js project?',
      default: 'qest-app',
      validate: (value) => {
        if (value.match(/^[a-zA-Z0-9-_]+$/)) return true;
        return 'Project name can only contain letters, numbers, dashes, and underscores.';
      }
    });
  }

  const targetDir = path.join(process.cwd(), projectName);
  console.log(`\n🚀 Bootstrapping qest.js in ./${projectName}...\n`);

  // 2. Create the folder structure
  const dirs = ['src', 'framework', 'pages'];
  for (const dir of dirs) {
    await fs.mkdir(path.join(targetDir, dir), { recursive: true });
  }

  // 3. Define files (Using string concatenation to avoid template literal crashes)
  const files = {
    // ---- CONFIGURATION ----
    'package.json': JSON.stringify({
      name: projectName,
      version: "1.0.0",
      type: "module",
      scripts: {
        "dev": "node framework/dev.js",
        "build": "node framework/build.js",
        "start": "node framework/server.js",
        "format": "prettier --write \"**/*.{js,jsx,css,json}\""
      },
      dependencies: {
        "preact": "^10.19.0",
        "preact-render-to-string": "^6.4.0"
      },
      devDependencies: {
        "esbuild": "^0.20.0",
        "prettier": "^3.2.5"
      }
    }, null, 2),

    '.prettierrc': JSON.stringify({
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      printWidth: 80,
      tabWidth: 2,
      jsxSingleQuote: false
    }, null, 2),

    '.prettierignore': "node_modules\ndist\n.cache\n",

    // ---- CLIENT HYDRATOR ----
    'src/client.jsx': "import { hydrate } from 'preact';\n\nconst Page = window.__PAGE_COMPONENT__;\n\nif (Page) {\n  hydrate(<Page />, document.getElementById('app'));\n}\n",

    // ---- FRAMEWORK GLUE ----
    'framework/dev.js': `import http from 'http';
import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { h } from 'preact';
import { pathToFileURL } from 'url';

const routeCache = new Map();

async function startDevServer() {
  console.log('Starting dev server...');

  const ctxServer = await esbuild.context({
    entryPoints: ['pages/**/*.jsx'],
    outdir: '.cache/server/pages',
    format: 'esm',
    bundle: true,
    packages: 'external',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.css': 'empty' }
  });

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

  http.createServer(async (req, res) => {
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
      } catch { /* Fallthrough */ }
    }

    try {
      let pagePath;
      if (routeCache.has(url)) {
        pagePath = routeCache.get(url);
      } else {
        pagePath = path.join(process.cwd(), '.cache/server/pages' + url + '.js');
        try {
          await fs.access(pagePath);
        } catch {
          pagePath = path.join(process.cwd(), '.cache/server/pages/404.js');
        }
        routeCache.set(url, pagePath);
      }

      const moduleUrl = pathToFileURL(pagePath);
      moduleUrl.searchParams.set('t', Date.now());
      const PageModule = await import(moduleUrl.href);
      const Page = PageModule.default;

      const { render } = await import('preact-render-to-string');
      const html = render(h(Page, null));
      
      const cssPath = '/.cache/client/pages' + url + '.css';
      let cssLink = '';
      try {
        await fs.access(path.join(process.cwd(), cssPath));
        cssLink = '<link rel="stylesheet" href="' + cssPath + '">';
      } catch { /* No CSS */ }

      const fullHtml = '<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>qest.js App</title>\\n  ' + cssLink + '\\n</head>\\n<body>\\n  <div id="app">' + html + '</div>\\n  <script type="module">\\n    import Page from "/.cache/client/pages' + url + '.js";\\n    window.__PAGE_COMPONENT__ = Page;\\n  </script>\\n  <script type="module" src="/.cache/client/src/client.js"></script>\\n</body>\\n</html>';

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fullHtml);
    } catch (err) {
      res.writeHead(500);
      res.end(err.stack);
    }
  }).listen(3000, () => {
    console.log('Running on http://localhost:3000');
  });
}

startDevServer();`,

    'framework/build.js': `import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { h } from 'preact';
import { pathToFileURL } from 'url';

async function build() {
  console.log('Building qest.js app...');

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
    bundle: true,
    packages: 'external',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.css': 'empty' }
  });

  const { render } = await import('preact-render-to-string');
  const pagesDir = path.join(process.cwd(), 'dist/server/pages');
  const files = await fs.readdir(pagesDir);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;

    const modulePath = pathToFileURL(path.join(pagesDir, file)).href;
    const PageModule = await import(modulePath);

    if (PageModule.prerender) {
      const Page = PageModule.default;
      const html = render(h(Page, null));
      const route = file.replace('.js', '');
      
      let cssLink = '';
      try {
        await fs.access(path.join(process.cwd(), 'dist/client/pages/' + route + '.css'));
        cssLink = '<link rel="stylesheet" href="/pages/' + route + '.css">';
      } catch { /* Ignore */ }

      const fullHtml = '<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>SSG Page</title>\\n  ' + cssLink + '\\n</head>\\n<body>\\n  <div id="app">' + html + '</div>\\n  <script type="module">\\n    import Page from "/pages/' + file + '";\\n    window.__PAGE_COMPONENT__ = Page;\\n  </script>\\n  <script type="module" src="/src/client.js"></script>\\n</body>\\n</html>';

      const outPath = path.join('dist/client', route === 'index' ? 'index.html' : route + '.html');
      await fs.writeFile(outPath, fullHtml);
      console.log('[SSG] Pre-rendered: ' + outPath);
    }
  }
}

build();`,

    'framework/server.js': `import http from 'http';
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
  '.css': 'text/css'
};

http.createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index';

  let staticPath = path.join(clientDir, url === '/index' ? 'index.html' : url);
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
      pagePath = path.join(serverDir, url + '.js');
      if (!fs.existsSync(pagePath)) {
        pagePath = path.join(serverDir, '404.js');
      }
      routeCache.set(url, pagePath);
    }

    const moduleUrl = pathToFileURL(pagePath).href;
    const PageModule = await import(moduleUrl);
    const Page = PageModule.default;

    const { render } = await import('preact-render-to-string');
    const html = render(h(Page, null));

    let cssLink = '';
    const cssPath = path.join(clientDir, 'pages' + url + '.css');
    if (fs.existsSync(cssPath)) {
      cssLink = '<link rel="stylesheet" href="/pages' + url + '.css">';
    }

    const fullHtml = '<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>SSR Page</title>\\n  ' + cssLink + '\\n</head>\\n<body>\\n  <div id="app">' + html + '</div>\\n  <script type="module">\\n    import Page from "/pages' + url + '.js";\\n    window.__PAGE_COMPONENT__ = Page;\\n  </script>\\n  <script type="module" src="/src/client.js"></script>\\n</body>\\n</html>';

    res.writeHead(pagePath.includes('404.js') ? 404 : 200, { 'Content-Type': 'text/html' });
    res.end(fullHtml);
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}).listen(3000, () => {
  console.log('Production server running on http://localhost:3000');
});`,

    // ---- APPLICATION PAGES ----
    'pages/index.jsx': "import './style.css';\n\nexport const prerender = true;\n\nexport default function Home() {\n  return (\n    <div className=\"container\">\n      <h1>Welcome to qest.js</h1>\n      <p>This is your SSG Home page.</p>\n      <a href=\"/about\">Go to SSR Route</a>\n    </div>\n  );\n}\n",
    
    'pages/about.jsx': "export default function About() {\n  return (\n    <div className=\"container\">\n      <h1>SSR About</h1>\n      <p>I am rendered dynamically on request.</p>\n      <a href=\"/\">Back Home</a>\n    </div>\n  );\n}\n",
    
    'pages/404.jsx': "export default function NotFound() {\n  return (\n    <div className=\"container\">\n      <h1>404 - Page Not Found</h1>\n    </div>\n  );\n}\n",
    
    'pages/style.css': "body {\n  font-family: sans-serif;\n  padding: 2rem;\n  background: #f0f0f0;\n}\n.container {\n  background: white;\n  padding: 2rem;\n  border-radius: 8px;\n}\n"
  };

  // 4. Write all files
  for (const [filePath, content] of Object.entries(files)) {
    await fs.writeFile(path.join(targetDir, filePath), content);
  }

  console.log('✅ Done! Your new project is ready.');
  console.log(`\nNext steps:\n  cd ${projectName}\n  bun install\n  bun run dev\n`);
}

scaffold().catch(console.error);