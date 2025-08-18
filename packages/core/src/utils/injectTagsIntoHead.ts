import type { Element } from "hast";
import { toHtml } from "hast-util-to-html";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { EXIT, visit } from "unist-util-visit";

export function injectTagsIntoHead(
  result: string,
  children: Element[],
  fragment: boolean,
) {
  const processor = unified().use(rehypeParse, { fragment });
  const tree = processor.parse(result);
  let hasHead = false;
  visit(tree, "element", (node) => {
    if (node.tagName === "head" && node.position) {
      hasHead = true;
      children.forEach((child) => node.children.push(child));
      return EXIT;
    }
  });
  if (!hasHead) {
    return result;
  }
  return toHtml(tree, { upperDoctype: true });
}
