import { useEffect, useMemo } from "react";
import { useLatest } from "./useLatest";

export function useResizeObserver(cb: ResizeObserverCallback) {
  const latestCb = useLatest(cb);

  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries, observer) => {
        latestCb.current(entries, observer);
      }),
    [],
  );

  useEffect(() => () => resizeObserver.disconnect(), []);

  return resizeObserver;
}
