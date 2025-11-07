import { AsyncLocalStorage } from "node:async_hooks";
import type { MightyContext } from "@/types";

export class MightyContextError extends Error {
  name = "MightyContextError";
}

const asyncLocalStorage = new AsyncLocalStorage<MightyContext>();

export async function runInContext<CallbackReturnType>(
  context: MightyContext,
  callback: () => Promise<CallbackReturnType>,
): Promise<CallbackReturnType> {
  return asyncLocalStorage.run(context, callback);
}

/**
 * Gets the Mighty context for the current request.
 */
export function getContext(): MightyContext {
  const store = asyncLocalStorage.getStore();
  if (!store) {
    throw new MightyContextError(
      "No context found. Are you trying to access the context in a prerendered page?",
    );
  }
  return store;
}
