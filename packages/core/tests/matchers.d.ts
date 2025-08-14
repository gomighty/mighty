interface CustomMatchers<R = unknown> {
  arrayMatching: (expected: RegExp[]) => R;
}

declare module "vitest" {
  // biome-ignore lint/suspicious/noExplicitAny: the Matchers generic is already defined in vitest as any by default
  interface Matchers<T = any> extends CustomMatchers<T> {}
}

export {};
