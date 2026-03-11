import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, '../client');

// Dynamically import the Vite-built server entry
const { renderPage } = await import('./entry-server.js');
const templateHtml = fs.readFileSync(
  path.join(clientDir, 'index.html'),
  'utf-8'
);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const server = http.createServer(async (req, res) => {
  let url = req.url.split('?')[0];

  // 1. Check for Static Files & SSG HTML
  let filePath = path.join(clientDir, url === '/' ? 'index.html' : url);
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    return res.end(fs.readFileSync(filePath));
  }

  // 2. SSR Hybrid Fallback
  try {
    const { html } = await renderPage(url);
    const finalHtml = templateHtml.replace('', html);
    const is404 = html.includes('404 Not Found');

    res.writeHead(is404 ? 404 : 200, { 'Content-Type': 'text/html' });
    res.end(finalHtml);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(3000, () => {
  console.log('Production server running at http://localhost:3000');
});
