import { useLayoutEffect, useMemo, useState } from "react";

type Args = {
  itemsCount: number;
  itemHeight: (index: number) => number;
  overScan?: number;
  getScrollElement: () => HTMLElement | null;
};

type Row = {
  index: number;
  height: number;
  offsetTop: number;
};
export const useFixedVirtuoso = ({
  getScrollElement,
  itemHeight,
  itemsCount,
  overScan = 3,
}: Args) => {
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
    const rangeStart = scrollTop;
    const rangeEnd = scrollTop + listHeight;

    let totalHeight = 0;
    let startIndex = -1;
    let endIndex = -1;
    const allRows: Row[] = Array(itemsCount);

    for (let index = 0; index < itemsCount; index += 1) {
      const row = {
        index,
        height: itemHeight(index),
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
  }, [scrollTop, listHeight, itemsCount]);

  return data;
};
