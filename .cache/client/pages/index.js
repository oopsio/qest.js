import {
  u
} from "../chunk-TRSNUKYY.js";

// pages/index.jsx
var prerender = true;
function Home() {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("h1", { children: "Home Page (SSG)" }),
    /* @__PURE__ */ u("p", { children: "Rendered at build time to a static HTML file." })
  ] });
}
export {
  Home as default,
  prerender
};
