import path from "node:path";
import type { Element } from "hast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const contentProcessor = unified().use(rehypeStringify);
const fragmentProcessor = unified().use(rehypeParse, { fragment: true });
const pageProcessor = unified().use(rehypeParse, { fragment: false });

export function getTreeFromOutput({
  output,
  fragment,
}: {
  output: string;
  fragment: boolean;
}) {
  // We replace the root path with a dummy path to have consistent snapshots
  const root = path.join(__dirname, "..");
  const outputWithRootReplaced = output.replaceAll(root, "/test_root");

  const processor = unified().use(rehypeParse, { fragment });

  return processor.parse(outputWithRootReplaced);
}

export function getContentFromMatchingTags({
  html,
  tag,
  fragment,
}: {
  html: string;
  tag: string;
  fragment: boolean;
}) {
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
}) {
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
