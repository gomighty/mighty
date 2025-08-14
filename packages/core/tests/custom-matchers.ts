import { expect } from "vitest";

expect.extend({
  arrayMatching(received, expected) {
    const { equals } = this;

    if (!Array.isArray(received) || !Array.isArray(expected)) {
      return {
        pass: false,
        message: () => "Received and expected must be arrays",
      };
    }

    if (!equals(received.length, expected.length)) {
      return {
        pass: false,
        message: () =>
          `Expected ${received.length} items, but got ${expected.length}`,
      };
    }

    const regexpUsed = new Set<RegExp>();

    for (const stringToTest of received) {
      if (typeof stringToTest !== "string") {
        return {
          pass: false,
          message: () => `Expected ${stringToTest} to be a string`,
        };
      }

      const regexp = expected.find(
        (regexp) => !regexpUsed.has(regexp) && regexp.test(stringToTest),
      );
      if (!regexp) {
        return {
          pass: false,
          message: () => `Expected ${received} to match ${expected}`,
        };
      }
      regexpUsed.add(regexp);
    }

    return {
      pass: true,
      message: () => `Expected ${received} not to match ${expected}`,
    };
  },
});
