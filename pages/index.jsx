import './style.css'; // Vite automatically extracts and bundles this

export const prerender = true;

export default function Home() {
  return (
    <div>
      <h1>Home Page (SSG)</h1>
      <p>Rendered at build time to a static HTML file.</p>
    </div>
  );
}
