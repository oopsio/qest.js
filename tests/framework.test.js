import { test, expect } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Helper to pause execution while the servers boot up
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('1. framework/build.js correctly compiles assets and runs SSG', async () => {
  // Clear the dist folder first to ensure a fresh build
  await fs.rm(path.join(process.cwd(), 'dist'), { recursive: true, force: true }).catch(() => {});

  // Run the build script
  const buildProcess = spawn('node', ['framework/build.js']);
  
  // Wait for the build process to finish naturally
  await new Promise((resolve, reject) => {
    buildProcess.on('close', resolve);
    buildProcess.on('error', reject);
  });

  // Assert 1: Did ESBuild create the server-side SSR bundles?
  const ssrBundleExists = await fs.access(path.join(process.cwd(), 'dist/server/pages/about.js')).then(() => true).catch(() => false);
  expect(ssrBundleExists, 'ESBuild failed to compile the SSR about.js bundle').toBe(true);

  // Assert 2: Did the SSG script correctly prerender index.html?
  const indexHtml = await fs.readFile(path.join(process.cwd(), 'dist/client/index.html'), 'utf-8');
  expect(indexHtml).toContain('Home Page (SSG)'); // FIXED STRING
  expect(indexHtml).toContain('window.__PAGE_COMPONENT__'); // Hydration script injected
}, 15000);

test('2. framework/server.js correctly serves Production traffic', async () => {
  // Boot the production server
  const server = spawn('node', ['framework/server.js']);
  await sleep(1000); // Give it a second to bind to port 3000

  try {
    // Assert 1: SSG Routing
    const resHome = await fetch('http://localhost:3000/');
    const htmlHome = await resHome.text();
    expect(resHome.status).toBe(200);
    expect(htmlHome).toContain('Home Page (SSG)'); // FIXED STRING

    // Assert 2: Dynamic SSR Routing
    const resAbout = await fetch('http://localhost:3000/about');
    const htmlAbout = await resAbout.text();
    expect(resAbout.status).toBe(200);
    expect(htmlAbout).toContain('About Page (SSR)'); // FIXED STRING

    // Assert 3: CSS serving
    const resCss = await fetch('http://localhost:3000/pages/index.css');
    expect(resCss.status).toBe(200);
    expect(resCss.headers.get('Content-Type')).toContain('text/css');

    // Assert 4: 404 Fallback
    const res404 = await fetch('http://localhost:3000/fake-route-that-does-not-exist');
    expect(res404.status).toBe(404);
  } finally {
    server.kill();
  }
});

test('3. framework/dev.js correctly handles live compilation', async () => {
  // Boot the dev server
  const devServer = spawn('node', ['framework/dev.js']);
  
  await sleep(2000);

  try {
    const res = await fetch('http://localhost:3000/about');
    const html = await res.text();
    
    expect(res.status).toBe(200);
    expect(html).toContain('Dev Server'); 
    expect(html).toContain('About Page (SSR)'); // FIXED STRING

  } finally {
    devServer.kill();
  }
}, 10000);