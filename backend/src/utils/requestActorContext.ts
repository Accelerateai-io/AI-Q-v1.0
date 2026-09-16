import { AsyncLocalStorage } from "node:async_hooks";

export type RequestActorContext = {
  userId?: number;
  email?: string;
};

const storage = new AsyncLocalStorage<RequestActorContext>();

/** Bind actor for the current async resource (prefer runWithRequestActor for Express). */
export function setRequestActor(ctx: RequestActorContext): void {
  storage.enterWith(ctx);
}

export function runWithRequestActor<T>(
  ctx: RequestActorContext,
  fn: () => T,
): T {
  return storage.run(ctx, fn);
}

export function getRequestActor(): RequestActorContext {
  return storage.getStore() ?? {};
}
