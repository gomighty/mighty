import { afterEach, describe, expect, it } from "bun:test";
import { getFixture } from "@tests/fixture";

describe("start context fixture", () => {
  const fixture = getFixture("start.context");

  afterEach(async () => {
    await fixture.clean();
  });

  it("can render an on-demand component with context", async () => {
    await fixture.build({ config: { output: "server" } });
    const { render } = await fixture.startProdServer();

    const response = await render({
      component: "index",
      props: {},
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
