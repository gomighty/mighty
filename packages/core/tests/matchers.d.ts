interface CustomMatchers<R = unknown> {
  arrayMatching: (expected: RegExp[]) => R;
}

declare module "bun:test" {
  interface Matchers<T> extends CustomMatchers<T> {}
}

export {};
