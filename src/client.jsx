import { hydrate } from 'preact';

const Page = window.__PAGE_COMPONENT__;

if (Page) {
  hydrate(<Page />, document.getElementById('app'));
}
