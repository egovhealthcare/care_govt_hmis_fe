// ESM stand-in for `use-sync-external-store/shim`, aliased in vite.config.ts.
// The package is CommonJS, so its `require("react")` is bundled against the
// plug's own copy of React instead of the host's shared one, and its hooks
// then run without a dispatcher. React 19 has the hook built in.
// Import, then export: module federation doesn't rewrite `export ... from`.
import { useSyncExternalStore } from "react";

export { useSyncExternalStore };
