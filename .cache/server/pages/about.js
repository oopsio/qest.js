// pages/about.jsx
import { jsx, jsxs } from "preact/jsx-runtime";
function About() {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h1", { children: "About Page (SSR)" }),
    /* @__PURE__ */ jsx("p", { children: "This page dynamically renders on the server per request." })
  ] });
}
export {
  About as default
};
