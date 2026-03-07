interface CustomMatchers<R = unknown> {
  arrayMatching: (expected: RegExp[]) => R;
}

declare module "vitest" {
  interface Assertion<T> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

export {};
