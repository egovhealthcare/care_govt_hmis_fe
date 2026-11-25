import type { AnyRouter } from "@tanstack/react-router";

/**
 * Plug version of the host's `routerRef`. The host calls `setRouter` on its
 * own copy of this module, never on this one, so fall back to the router
 * TanStack Router registers on `self.__TSR_ROUTER__` in the browser, which is
 * the host's router.
 */
let current: AnyRouter | undefined;

export function setRouter(router: AnyRouter) {
  current = router;
}

export function getRouter(): AnyRouter {
  const router =
    current ?? (self as { __TSR_ROUTER__?: AnyRouter }).__TSR_ROUTER__;
  if (!router) {
    throw new Error("The app router is not created yet.");
  }
  return router;
}
