import { type DevRenderFunction, getFixture } from "@tests/fixture";
import { getContentFromMatchingTags } from "@tests/utils";
import "@tests/custom-matchers";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("dev partytown fixture", () => {
  let render: DevRenderFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.partytown");

  beforeEach(async () => {
    ({ render, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a page with partytown", async () => {
    const response = await render({
      component: "basic",
      props: {},
      context: {},
      partial: false,
    });

    expect(response.status).toBe(200);

    const scripts = getContentFromMatchingTags({
      html: response.content,
      tag: "script",
      fragment: false,
    });
    expect(scripts).arrayMatching([/partytown/, /^$/]);
  });
});
