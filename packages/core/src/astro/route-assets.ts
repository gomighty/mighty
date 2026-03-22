import type { RouteInfo } from "astro";
import type { Element } from "hast";

export function getRouteHeadElements(routeInfo: RouteInfo): Element[] {
  const styleTags: Element[] = routeInfo.styles.map((style) => {
    if (style.type === "inline") {
      return {
        type: "element",
        tagName: "style",
        properties: {
          type: "text/css",
        },
        children: [{ type: "text", value: style.content }],
      };
    }

    return {
      type: "element",
      tagName: "link",
      properties: {
        rel: "stylesheet",
        href: style.src,
      },
      children: [],
    };
  });

  const scriptTags: Element[] = routeInfo.scripts.map((script) => {
    if ("type" in script) {
      if (script.type === "external") {
        return {
          type: "element",
          tagName: "script",
          properties: {
            type: "module",
            src: script.value,
          },
          children: [],
        };
      }

      return {
        type: "element",
        tagName: "script",
        properties: {
          type: "module",
        },
        children: [{ type: "text", value: script.value }],
      };
    }

    return {
      type: "element",
      tagName: "script",
      properties: {},
      children: [{ type: "text", value: script.children }],
    };
  });

  return [...styleTags, ...scriptTags];
}
