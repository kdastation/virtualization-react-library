import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { scheduleDOMUpdate } from "../lib/domUtils/scheduleDOMUpdate";
import { rafThrottle } from "../lib/rafThrottle/rafThrottle";
import { isNumber } from "../lib/sharedUtils";
import { useResizeObserver } from "../lib/hooks/useResizeObserver";
import { useLatest } from "../lib/hooks/useLatest";

type Id = string | number;

type Args = {
  itemsCount: number;
  itemHeight?: (index: number) => number;
  estimateItemHeight?: (index: number) => number;
  overScan?: number;
  getScrollElement: () => HTMLElement | null;
  getItemId: (index: number) => Id;
};

const validateProps = (props: Args) => {
  const { itemHeight, estimateItemHeight } = props;

  if (!itemHeight && !estimateItemHeight) {
    throw new Error(
      "you must pass either 'itemHeight' or 'estimateItemHeight' prop",
    );
  }
};

type Row = {
  index: number;
  height: number;
  offsetTop: number;
};
export const useVirtuoso = (props: Args) => {
  const {
    getScrollElement,
    itemHeight,
    itemsCount,
    overScan = 3,
    getItemId,
    estimateItemHeight,
  } = props;

  validateProps(props);

  const [measurmentCache, setMeasurmentCache] = useState<Record<Id, number>>(
    {},
  );
  const [listHeight, setListHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const height =
        entry.borderBoxSize[0]?.blockSize ??
        entry.target.getBoundingClientRect().height;

      setListHeight(height);
    });

    resizeObserver.observe(scrollElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [getScrollElement]);

  useLayoutEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    const handleScroll = () => {
      const scrollTop = scrollElement.scrollTop;

      setScrollTop(scrollTop);
    };

    handleScroll();

    const throttledHandleScroll = rafThrottle(handleScroll);

    scrollElement.addEventListener("scroll", throttledHandleScroll);

    return () =>
      scrollElement.removeEventListener("scroll", throttledHandleScroll);
  }, [getScrollElement]);

  const { allItems, totalHeight, startIndex, endIndex, virtualItems } =
    useMemo(() => {
      const getItemHeight = (index: number) => {
        if (itemHeight) {
          return itemHeight(index);
        }

        const id = getItemId(index);

        if (isNumber(measurmentCache[id])) {
          return measurmentCache[id]!;
        }

        return estimateItemHeight!(index);
      };
      const rangeStart = scrollTop;
      const rangeEnd = scrollTop + listHeight;

      let totalHeight = 0;
      let startIndex = -1;
      let endIndex = -1;
      const allRows: Row[] = Array(itemsCount);

      for (let index = 0; index < itemsCount; index += 1) {
        const id = getItemId(index);

        const row = {
          id,
          index,
          height: getItemHeight(index),
          offsetTop: totalHeight,
        };

        totalHeight += row.height;
        allRows[index] = row;

        if (startIndex === -1 && row.offsetTop + row.height > rangeStart) {
          startIndex = Math.max(0, index - overScan);
        }

        if (endIndex === -1 && row.offsetTop + row.height >= rangeEnd) {
          endIndex = Math.min(itemsCount - 1, index + overScan);
        }
      }

      const virtualRows = allRows.slice(startIndex, endIndex + 1);

      return {
        virtualItems: virtualRows,
        totalHeight,
        startIndex,
        endIndex,
        allItems: allRows,
      };
    }, [
      scrollTop,
      listHeight,
      itemsCount,
      estimateItemHeight,
      itemHeight,
      measurmentCache,
    ]);

  const latestData = useLatest({
    getItemId,
    measurmentCache,
    allItems,
    getScrollElement,
    scrollTop,
  });

  const measureElementInner = useCallback(
    ({
      element,
      resizeObserver,
      entry,
    }: {
      element: Element | null;
      resizeObserver: ResizeObserver;
      entry?: ResizeObserverEntry;
    }) => {
      if (!element) {
        return;
      }

      if (!element.isConnected) {
        resizeObserver.unobserve(element);
        return;
      }

      const index = parseInt(element.getAttribute("data-index") || "", 10);

      if (Number.isNaN(index)) {
        console.error(
          "dynamic elements must have a valid `data-index` attribute",
        );
        return;
      }

      const { measurmentCache, getItemId, allItems, scrollTop } =
        latestData.current;

      const id = getItemId(index);

      const isResize = Boolean(entry);

      resizeObserver.observe(element);

      if (!isResize && isNumber(measurmentCache[id])) {
        return;
      }

      const height =
        entry?.borderBoxSize[0]?.blockSize ??
        element.getBoundingClientRect().height;

      if (measurmentCache[id] === height) {
        return;
      }

      const item = allItems[index]!;
      const delta = height - item.height;

      if (delta !== 0 && scrollTop > item.offsetTop) {
        const element = getScrollElement();
        if (element) {
          scheduleDOMUpdate(() => {
            element.scrollBy(0, delta);
          });
        }
      }

      setMeasurmentCache((cache) => ({ ...cache, [id]: height }));
    },
    [],
  );

  const itemsResizeObserver = useResizeObserver((entries, observer) => {
    entries.forEach((entry) => {
      measureElementInner({
        element: entry.target,
        resizeObserver: observer,
        entry,
      });
    });
  });

  const measureElement = useCallback(
    (element: Element | null) => {
      measureElementInner({ element, resizeObserver: itemsResizeObserver });
    },
    [itemsResizeObserver],
  );

  return {
    allItems,
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    measureElement,
  };
};
