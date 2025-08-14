import npath from "node:path";
import { isCSSRequest, type ModuleNode, type ViteDevServer } from "vite";

interface ImportedStyle {
  id: string;
  url: string;
  content: string;
}

const rawRE = /(?:\?|&)raw(?:&|$)/;
const inlineRE = /(?:\?|&)inline\b/;

const isBuildableCSSRequest = (request: string): boolean =>
  isCSSRequest(request) && !rawRE.test(request) && !inlineRE.test(request);

const inlineQueryRE = /(?:\?|&)inline(?:$|&)/;

export async function getStylesForURL(
  filePath: string,
  viteServer: ViteDevServer,
): Promise<{
  urls: Set<string>;
  styles: ImportedStyle[];
  crawledFiles: Set<string>;
}> {
  const importedCssUrls = new Set<string>();
  // Map of url to injected style object. Use a `url` key to deduplicate styles
  const importedStylesMap = new Map<string, ImportedStyle>();
  const crawledFiles = new Set<string>();

  // Mighty addition: import the module beforehand to make sure we can crawl the graph
  await viteServer.ssrLoadModule(filePath);

  for await (const importedModule of crawlGraph(viteServer, filePath, true)) {
    if (importedModule.file) {
      crawledFiles.add(importedModule.file);
    }
    if (isBuildableCSSRequest(importedModule.url)) {
      // In dev, we inline all styles if possible
      let css = "";
      // If this is a plain CSS module, the default export should be a string
      if (typeof importedModule.ssrModule?.default === "string") {
        css = importedModule.ssrModule.default;
      }
      // Else try to load it
      else {
        let modId = importedModule.url;
        // Mark url with ?inline so Vite will return the CSS as plain string, even for CSS modules
        if (!inlineQueryRE.test(importedModule.url)) {
          if (importedModule.url.includes("?")) {
            modId = importedModule.url.replace("?", "?inline&");
          } else {
            modId += "?inline";
          }
        }
        try {
          // The SSR module is possibly not loaded. Load it if it's null.
          const ssrModule = await viteServer.ssrLoadModule(modId);
          css = ssrModule.default;
        } catch {
          // The module may not be inline-able, e.g. SCSS partials. Skip it as it may already
          // be inlined into other modules if it happens to be in the graph.
          continue;
        }
      }

      importedStylesMap.set(importedModule.url, {
        id: wrapId(importedModule.id ?? importedModule.url),
        url: wrapId(importedModule.url),
        content: css,
      });
    }
  }

  return {
    urls: importedCssUrls,
    styles: [...importedStylesMap.values()],
    crawledFiles,
  };
}

function wrapId(id: string): string {
  return id.replace(
    NULL_BYTE_REGEX,
    `${VALID_ID_PREFIX}${NULL_BYTE_PLACEHOLDER}`,
  );
}

const VALID_ID_PREFIX = `/@id/`;
const NULL_BYTE_PLACEHOLDER = `__x00__`;
const NULL_BYTE_REGEX = /^\0/;

function unwrapId(id: string): string {
  return id.startsWith(VALID_ID_PREFIX)
    ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, "\0")
    : id;
}

const SUPPORTED_MARKDOWN_FILE_EXTENSIONS = [
  ".markdown",
  ".mdown",
  ".mkdn",
  ".mkd",
  ".mdwn",
  ".md",
] as const;

const fileExtensionsToSSR = new Set([
  ".astro",
  ".mdoc",
  ...SUPPORTED_MARKDOWN_FILE_EXTENSIONS,
]);

const STRIP_QUERY_PARAMS_REGEX = /\?.*$/;

const specialQueriesRE = /(?:\?|&)(?:url|raw|direct)(?:&|$)/;
/**
 * Detect `?url`, `?raw`, and `?direct`, in which case we usually want to skip
 * transforming any code with this queries as Vite will handle it directly.
 */
function hasSpecialQueries(id: string): boolean {
  return specialQueriesRE.test(id);
}

async function* crawlGraph(
  viteServer: ViteDevServer,
  _id: string,
  isRootFile: boolean,
  scanned = new Set<string>(),
): AsyncGenerator<ModuleNode, void, unknown> {
  const id = unwrapId(_id);
  const importedModules = new Set<ModuleNode>();

  const moduleEntriesForId = isRootFile
    ? // "getModulesByFile" pulls from a delayed module cache (fun implementation detail),
      // So we can get up-to-date info on initial server load.
      // Needed for slower CSS preprocessing like Tailwind
      (viteServer.moduleGraph.getModulesByFile(id) ?? new Set())
    : // For non-root files, we're safe to pull from "getModuleById" based on testing.
      // TODO: Find better invalidation strategy to use "getModuleById" in all cases!
      new Set([viteServer.moduleGraph.getModuleById(id)]);

  // Collect all imported modules for the module(s).
  for (const entry of moduleEntriesForId) {
    // Handle this in case an module entries weren't found for ID
    // This seems possible with some virtual IDs (ex: `astro:markdown/*.md`)
    if (!entry) {
      continue;
    }
    if (id === entry.id) {
      scanned.add(id);

      // NOTE: It may be worth revisiting if we can crawl direct imports of the module since
      // `.importedModules` would also include modules that are dynamically watched, not imported.
      // That way we no longer need the below `continue` skips.

      // CSS requests `importedModules` are usually from `@import`, but we don't really need
      // to crawl into those as the `@import` code are already inlined into this `id`.
      // If CSS requests `importedModules` contain non-CSS files, e.g. Tailwind might add HMR
      // dependencies as `importedModules`, we should also skip them as they aren't really
      // imported. Without this, every hoisted script in the project is added to every page!
      if (isCSSRequest(id)) {
        continue;
      }
      // Some special Vite queries like `?url` or `?raw` are known to be a simple default export
      // and doesn't have any imports to crawl. However, since they would `this.addWatchFile` the
      // underlying module, our logic would crawl into them anyways which is incorrect as they
      // don't take part in the final rendering, so we skip it here.
      if (hasSpecialQueries(id)) {
        continue;
      }

      for (const importedModule of entry.importedModules) {
        if (!importedModule.id) continue;

        // some dynamically imported modules are *not* server rendered in time
        // to only SSR modules that we can safely transform, we check against
        // a list of file extensions based on our built-in vite plugins

        // Strip special query params like "?content".
        // NOTE: Cannot use `new URL()` here because not all IDs will be valid paths.
        // For example, `virtual:image-loader` if you don't have the plugin installed.
        const importedModulePathname = importedModule.id.replace(
          STRIP_QUERY_PARAMS_REGEX,
          "",
        );

        const isFileTypeNeedingSSR = fileExtensionsToSSR.has(
          npath.extname(importedModulePathname),
        );
        // A propagation stopping point is a module with the ?astroPropagatedAssets flag.
        // When we encounter one of these modules we don't want to continue traversing.
        const isPropagationStoppingPoint = importedModule.id.includes(
          "?astroPropagatedAssets",
        );
        if (
          isFileTypeNeedingSSR &&
          // Should not SSR a module with ?astroPropagatedAssets
          !isPropagationStoppingPoint
        ) {
          const mod = viteServer.moduleGraph.getModuleById(importedModule.id);
          if (!mod?.ssrModule) {
            try {
              await viteServer.ssrLoadModule(importedModule.id);
            } catch {
              /** Likely an out-of-date module entry! Silently continue. */
            }
          }
        }

        // Make sure the `importedModule` traversed is explicitly imported by the user, and not by HMR
        // TODO: This isn't very performant. Maybe look into using `ssrTransformResult` but make sure it
        // doesn't regress UnoCSS. https://github.com/withastro/astro/issues/7529
        if (isImportedBy(id, importedModule) && !isPropagationStoppingPoint) {
          importedModules.add(importedModule);
        }
      }
    }
  }

  // scan imported modules for CSS imports & add them to our collection.
  // Then, crawl that file to follow and scan all deep imports as well.
  for (const importedModule of importedModules) {
    if (!importedModule.id || scanned.has(importedModule.id)) {
      continue;
    }

    yield importedModule;
    yield* crawlGraph(viteServer, importedModule.id, false, scanned);
  }
}

function isImportedBy(parent: string, entry: ModuleNode) {
  for (const importer of entry.importers) {
    if (importer.id === parent) {
      return true;
    }
  }
  return false;
}
