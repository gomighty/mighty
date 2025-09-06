import { type AppRequestFunction, getFixture } from "@tests/fixture";
import { getContentFromMatchingTags } from "@tests/utils";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("dev partytown fixture", () => {
  let request: AppRequestFunction;
  let stop: () => Promise<void>;

  const fixture = getFixture("dev.partytown");

  beforeEach(async () => {
    ({ request, stop } = await fixture.startDevServer());
  });

  afterEach(async () => {
    await stop();
  });

  it("can render a page with partytown", async () => {
    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "basic",
        partial: false,
      }),
    });

    expect(response.status).toBe(200);

    const output = await response.text();

    const scripts = getContentFromMatchingTags({
      html: output,
      tag: "script",
      fragment: false,
    });
    expect(scripts).arrayMatching([/partytown/, /^$/]);
  });
});
