import { afterEach, describe, expect, it } from "bun:test";
import { getFixture } from "@tests/fixture";

describe("start context fixture", () => {
  const fixture = getFixture("start.context");

  afterEach(async () => {
    await fixture.clean();
  });

  it("can render an on-demand component with context", async () => {
    await fixture.build({ config: { output: "server" } });
    const { request } = await fixture.startProdServer();

    const response = await request("/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        component: "index",
        context: {
          notifications: ["Hello World"],
          user: {
            id: 1,
          },
        },
      }),
    });
    expect(response.status).toBe(200);

    const output = await response.text();

    expect(output).toBe(
      "<p>Context: {&quot;notifications&quot;:[&quot;Hello World&quot;],&quot;user&quot;:{&quot;id&quot;:1}}</p>",
    );
  });
});
