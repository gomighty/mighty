import { AsyncLocalStorage } from "node:async_hooks";
import type { MightyContext } from "@/types";

const asyncLocalStorage = new AsyncLocalStorage<MightyContext>();

export async function runInContext<CallbackReturnType>(
  context: MightyContext,
  callback: () => Promise<CallbackReturnType>,
): Promise<CallbackReturnType> {
  return asyncLocalStorage.run(context, callback);
}

export function getContext(): MightyContext {
  const store = asyncLocalStorage.getStore();
  if (!store) {
    throw new Error("No context found");
  }
  return store;
}
