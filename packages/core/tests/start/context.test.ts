import { getFixture } from "@tests/fixture";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("start context fixture", () => {
  let fixture: ReturnType<typeof getFixture>;

  beforeEach(() => {
    fixture = getFixture("start.context");
  });

  afterEach(async () => {
    await fixture.clean();
  });

  it("can render an on-demand component with context", async () => {
    await fixture.build({ config: { output: "server" } });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "index",
      context: {
        notifications: ["Hello World"],
        user: {
          id: 1,
        },
      },
      partial: true,
    });
    expect(response).toEqual({
      status: 200,
      content:
        "<p>Context: {&quot;notifications&quot;:[&quot;Hello World&quot;],&quot;user&quot;:{&quot;id&quot;:1}}</p>",
    });
  });
});
