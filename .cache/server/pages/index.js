// pages/index.jsx
import { jsx, jsxs } from "preact/jsx-runtime";
var prerender = true;
function Home() {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h1", { children: "Home Page (SSG)" }),
    /* @__PURE__ */ jsx("p", { children: "Rendered at build time to a static HTML file." })
  ] });
}
export {
  Home as default,
  prerender
};
