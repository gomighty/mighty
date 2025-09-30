import type { Element } from "hast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const contentProcessor = unified().use(rehypeStringify);
const fragmentProcessor = unified().use(rehypeParse, { fragment: true });
const pageProcessor = unified().use(rehypeParse, { fragment: false });

export function getContentFromMatchingTags({
  html,
  tag,
  fragment,
}: {
  html: string;
  tag: string;
  fragment: boolean;
}): string[] {
  const tree = fragment
    ? fragmentProcessor.parse(html)
    : pageProcessor.parse(html);

  const tagContent: string[] = [];

  visit(tree, "element", (node) => {
    if (node.tagName === tag) {
      tagContent.push(
        contentProcessor.stringify({
          type: "root",
          children: node.children,
        }),
      );
    }
  });

  return tagContent;
}

export function getMatchingTags({
  html,
  tag,
  fragment,
}: {
  html: string;
  tag: string;
  fragment: boolean;
}): Element[] {
  const tree = fragment
    ? fragmentProcessor.parse(html)
    : pageProcessor.parse(html);
  const matchingTags: Element[] = [];

  visit(tree, "element", (node) => {
    if (node.tagName === tag) {
      matchingTags.push(node);
    }
  });

  return matchingTags;
}
