/**
 * Typed wrapper around the host's component-override bridge.
 *
 * The host installs `window.__careOverrides` (see host's
 * `src/lib/override/bridge.ts`). Plugs should never touch that global
 * directly — they go through the helpers in this file so that:
 *
 *   - the global is treated as optional (the plug must keep working when
 *     loaded against a host that doesn't expose the bridge),
 *   - all override registrations share one warning/logging convention,
 *   - the entry shape is type-checked at the call site instead of `any`.
 *
 * This file is intentionally tiny and free of plug-specific imports so it
 * can be copy-pasted into a new plug verbatim.
 */
import type { ComponentType } from "react";

const PLUG_TAG = "[care_appointment_plug]";

/**
 * Subset of the host's `OverrideContextType` (see host's
 * `src/lib/override/types.ts`). Inlined so this file has no host import
 * and can be copy-pasted into any plug verbatim.
 *
 * `route` is the current `usePath()` value — updated automatically by the
 * host's `OverrideProvider` on every navigation. `page` is a derived first
 * path segment (e.g. `"facility"`). Both are present whenever the plug
 * runs inside the host app.
 */
export interface OverrideContext {
  route?: string;
  page?: string;
  userRole?: string;
  facilityType?: string;
  [key: string]: unknown;
}

/**
 * Conditions that scope an override to a subset of render sites. The
 * host's resolver evaluates these on every route / context change; the
 * first override whose conditions all match wins.
 */
export interface OverrideCondition {
  /** Match `OverrideContext.page` exactly (or any of the listed pages). */
  page?: string | string[];
  /** Match `OverrideContext.userRole`. */
  userRole?: string | string[];
  /** Match `OverrideContext.facilityType`. */
  facilityType?: string | string[];
  /**
   * Stack-path match against ancestor `register()`-wrapped components.
   * Requires those ancestors to be registered in the host — usually not
   * available without host changes.
   */
  stackPath?: string[];
  /**
   * Arbitrary predicate against the live `OverrideContext`. Use this for
   * URL / route matching:
   *   `custom: ({ route }) => route?.startsWith("/foo") ?? false`
   */
  custom?: (context: OverrideContext) => boolean;
}

/** Shape of a single component override entry handed to the host. */
export interface ComponentOverrideEntry<P = unknown> {
  component: ComponentType<P>;
  /** Human-readable note shown in host devtools / logs. */
  description?: string;
  /** Higher wins when multiple plugs register the same key. Defaults to 0. */
  priority?: number;
  /** Optional scope. When omitted the override applies everywhere. */
  condition?: OverrideCondition;
}

/** Subset of the host bridge we depend on. */
interface CareOverridesBridge {
  addComponent: (key: string, entry: ComponentOverrideEntry) => () => void;
}

declare global {
  interface Window {
    __careOverrides?: CareOverridesBridge;
  }
}

function getBridge(): CareOverridesBridge | null {
  const bridge = window.__careOverrides;
  if (!bridge) {
    console.warn(
      `${PLUG_TAG} window.__careOverrides unavailable; skipping component override registration.`,
    );
    return null;
  }
  return bridge;
}

/**
 * Register a single component override with the host. Returns the host's
 * dispose function, or a no-op when the bridge is unavailable.
 */
export function registerComponentOverride<P>(
  key: string,
  entry: ComponentOverrideEntry<P>,
): () => void {
  const bridge = getBridge();
  if (!bridge) return () => {};

  const dispose = bridge.addComponent(key, entry as ComponentOverrideEntry);
  console.info(`${PLUG_TAG} registered override for ${key}`);
  return dispose;
}

/**
 * Register many component overrides at once. The map keys are the host
 * component keys; values are entries.
 *
 * Example:
 * ```ts
 * defineComponentOverrides({
 *   BookAppointmentDetails: { component: MyForkedDetails, description: "…" },
 * });
 * ```
 */
export function defineComponentOverrides(map: {
  [key: string]: ComponentOverrideEntry<never>;
}): void {
  const bridge = getBridge();
  if (!bridge) return;

  for (const [key, entry] of Object.entries(map)) {
    bridge.addComponent(key, entry as ComponentOverrideEntry);
    console.info(`${PLUG_TAG} registered override for ${key}`);
  }
}
