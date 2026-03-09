import type { MightyContext } from "@gomighty/core";
import { getContext } from "@gomighty/core/context";

export function shared<T extends MightyContext = MightyContext>(): T {
  return getContext<T>();
}
