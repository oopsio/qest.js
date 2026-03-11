
# qest.js

A lightning-fast, zero-magic hybrid web framework built the hard way. qest.js combines Static Site Generation (SSG) and Server-Side Rendering (SSR) using raw ESBuild, native Node.js HTTP servers, and Preact.

No wrappers. No bloated dev servers. Just standard JavaScript glued together for maximum performance and ultimate control.

## Features

* **Hybrid Rendering:** Export `prerender = true` for SSG, or omit it for dynamic SSR on every request.
* **Zero-Dependency Dev Server:** A custom Node.js development server with on-the-fly ESBuild compilation.
* **Native Memory Caching:** Uses standard JavaScript `Map` for high-speed route resolution and caching (seriously, who needs Redis for route caching when we have `Map` from JS).
* **File-Based Routing:** Simply drop Preact components into the `pages/` directory.
* **First-Class Preact:** Native JSX compilation mapped directly to Preact's `h` function.
* **Built-in Testing:** E2E and component testing ready out of the box using Vitest and JSdom.

## Quick Start

The fastest way to start building with qest is to use the scaffolding CLI.

```bash
# Scaffold a new project
bun create qest my-app

# Navigate to the directory
cd my-app

# Install dependencies
bun install

# Start the development server
bun run dev

```

## Available Commands

* `bun run dev`: Starts the local development server with live ESBuild compilation at `http://localhost:3000`.
* `bun run build`: Compiles the application, bundles client/server assets, and executes the SSG pipeline to generate static HTML.
* `bun start`: Boots the production-ready Node.js HTTP server to serve your built application.
* `bun run format`: Runs Prettier over the codebase to ensure clean formatting.
* `bun test`: Executes the Vitest integration and component test suite.

## Project Structure

```text
/
├── package.json
├── src/
│   └── client.jsx         # Client-side Preact hydrator
├── framework/
│   ├── dev.js             # Custom dev server & on-the-fly compiler
│   ├── build.js           # Production bundler & SSG generator
│   └── server.js          # Production HTTP server
└── pages/
    ├── index.jsx          # Becomes / (SSG example)
    ├── about.jsx          # Becomes /about (SSR example)
    ├── 404.jsx            # Fallback route
    └── style.css          # Global styles

```

## Routing

Routing is completely file-based.

### Server-Side Rendering (SSR)

Any `.jsx` file added to `pages/` becomes a dynamic route by default. It is rendered on the server per request.

```javascript
// pages/about.jsx
export default function About() {
  return <h1>About Page</h1>;
}

```

### Static Site Generation (SSG)

To pre-render a page at build time, simply export `prerender = true`. The framework will compile it into a static `.html` file inside the `dist/` folder, allowing the server to serve it instantly.

```javascript
// pages/index.jsx
export const prerender = true;

export default function Home() {
  return <h1>Fast Static Home</h1>;
}

```

## License

MIT © vss.co
