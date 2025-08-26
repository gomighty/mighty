import { rm } from "node:fs/promises";
import path from "node:path";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { createDevHonoApp } from "@/dev/app";
import type { MightyServerOptions } from "@/types";

const contentProcessor = unified().use(rehypeStringify);
const fragmentProcessor = unified().use(rehypeParse, { fragment: true });
const pageProcessor = unified().use(rehypeParse, { fragment: false });

export type AppRequestFunction = (
  input: string | URL,
  requestInit?: RequestInit,
) => Promise<Response>;

export function getFixture(fixtureName: string) {
  const fixtureRoot = path.join(__dirname, "..", "fixtures", fixtureName);

  return {
    startDevServer: async (params?: MightyServerOptions) => {
      const { app, viteServer } = await createDevHonoApp({
        config: {
          root: fixtureRoot,
          logLevel: "warn",
          ...params,
        },
      });

      const request: AppRequestFunction = async (input, requestInit) => {
        return app.request(input, requestInit, {
          incoming: {
            socket: {
              remoteAddress: "http://host-placeholder.test",
              remoteFamily: "IPv4",
              remotePort: 80,
            },
          },
        });
      };

      return {
        app,
        request,
        stop: async () => {
          await viteServer.close();
          await rm(path.join(fixtureRoot, ".astro"), {
            recursive: true,
            force: true,
          });
          await rm(path.join(fixtureRoot, "node_modules"), {
            recursive: true,
            force: true,
          });
        },
      };
    },
  };
}

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
