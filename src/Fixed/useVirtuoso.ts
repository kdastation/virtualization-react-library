import {
  useCallback,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const isNumber = (value: unknown): value is number => {
  return typeof value === "number";
};

const useLatest = <Value>(value: Value) => {
  const valueRef = useRef(value);

  useInsertionEffect(() => {
    valueRef.current = value;
  });

  return valueRef;
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

    scrollElement.addEventListener("scroll", handleScroll);

    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [getScrollElement]);

  const data = useMemo(() => {
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

  const latestData = useLatest({ getItemId, measurmentCache });

  const itemsResizeObserver = useMemo(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;

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

        const height =
          entry.borderBoxSize[0]?.blockSize ??
          element.getBoundingClientRect().height;

        const { measurmentCache, getItemId } = latestData.current;

        const id = getItemId(index);

        if (measurmentCache[id] === height) {
          return;
        }

        setMeasurmentCache((prev) => {
          return {
            ...prev,
            [id]: height,
          };
        });
      });
    });

    return resizeObserver;
  }, [latestData]);

  const measureElement = useCallback(
    (element: Element | null) => {
      if (!element) {
        return;
      }
      const index = parseInt(element.getAttribute("data-index") || "", 10);

      if (Number.isNaN(index)) {
        console.error(
          "dynamic elements must have a valid `data-index` attribute",
        );
        return;
      }

      const size = element.getBoundingClientRect();

      const { measurmentCache, getItemId } = latestData.current;

      const id = getItemId(index);

      itemsResizeObserver.observe(element);

      if (isNumber(measurmentCache[id])) {
        return;
      }

      setMeasurmentCache((prev) => {
        return {
          ...prev,
          [id]: size.height,
        };
      });
    },
    [itemsResizeObserver, latestData],
  );

  return {
    ...data,
    measureElement,
  };
};
