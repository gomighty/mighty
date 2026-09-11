# Mighty

Mighty lets a backend of any language render Astro pages on demand, the way Inertia.js lets a backend drive a JavaScript SPA. This glossary fixes the words the packages, docs, and issues use for that.

## Language

**Adapter**:
The integration between one backend framework (Hono, Laravel) and Mighty. An adapter turns a backend request into a render request and returns the result as a backend response.
_Avoid_: Integration, plugin, driver

**Render request**:
The unit of work an adapter hands to Mighty: which Astro page component to render, with which props and shared context, and whether to render it as a partial.
_Avoid_: Render call, page request

**Shared context**:
Per-request data the backend exposes to every Astro component in a render, outside of props. Auth user, session flashes, and CSRF tokens are typical.
_Avoid_: Globals, shared props, locals

**Sidecar**:
A separate Node process that serves render requests over a local transport for adapters whose backend cannot run Astro in-process.
_Avoid_: Render server, bridge, daemon
