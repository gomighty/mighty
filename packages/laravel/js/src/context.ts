import { getContext } from "@gomighty/core/context";

export function user<T = unknown>(): T | undefined {
  return getContext<{ _user?: T }>()._user;
}

export function session(key?: string): unknown {
  const s = getContext<{ _session?: Record<string, unknown> }>()._session ?? {};
  return key ? s[key] : s;
}

export function errors(bag = "default"): Record<string, string[]> {
  const e =
    getContext<{
      _errors?: Record<string, Record<string, string[]>>;
    }>()._errors ?? {};
  return e[bag] ?? {};
}

export function csrfToken(): string {
  return getContext<{ _csrfToken?: string }>()._csrfToken ?? "";
}

export function shared<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): T {
  return (getContext<{ _shared?: T }>()._shared ?? {}) as T;
}
