// ESM port of `use-sync-external-store/shim/with-selector` (MIT, Meta
// Platforms), aliased in vite.config.ts for the same reason as
// `./useSyncExternalStore.ts`: imports `react` as an ES module so that module
// federation resolves it to the host's React.
import {
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const instRef = useRef<{ hasValue: boolean; value: Selection | null } | null>(
    null,
  );
  if (instRef.current === null) {
    instRef.current = { hasValue: false, value: null };
  }
  const inst = instRef.current;

  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selection;

    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection;
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection;
            return currentSelection;
          }
        }
        memoizedSelection = nextSelection;
        return nextSelection;
      }
      const currentSelection = memoizedSelection;
      if (Object.is(memoizedSnapshot, nextSnapshot)) return currentSelection;
      const nextSelection = selector(nextSnapshot);
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return currentSelection;
      }
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };

    return [
      () => memoizedSelector(getSnapshot()),
      getServerSnapshot == null
        ? undefined
        : () => memoizedSelector(getServerSnapshot()),
    ];
  }, [getSnapshot, getServerSnapshot, selector, isEqual, inst]);

  const value = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection,
  );

  useEffect(() => {
    inst.hasValue = true;
    inst.value = value;
  }, [inst, value]);

  useDebugValue(value);
  return value;
}
