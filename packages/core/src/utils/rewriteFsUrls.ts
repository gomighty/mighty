/**
 * Rewrite bare `/@fs/` URLs to include the Mighty dev address.
 *
 * Astro's image vite plugin (`astro:assets:esm`) hardcodes image `src` as
 * `/@fs/<abs-path>` without the Vite base prefix. Without rewriting, the
 * browser requests `/@fs/...` from the app server instead of the Vite dev
 * server, resulting in a 404.
 */
export function rewriteFsUrls(html: string, address: string): string {
  return html.replace(/(["'(])\/@fs\//g, `$1${address}/@fs/`);
}
