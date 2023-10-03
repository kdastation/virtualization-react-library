import { useLayoutEffect, useMemo, useState } from "react";

type Args = {
  itemsCount: number;
  itemHeight: number;
  listHeight: number;
  overScan?: number;
  getScrollElement: () => HTMLElement | null;
};
export const useFixedVirtuoso = ({
  getScrollElement,
  listHeight,
  itemHeight,
  itemsCount,
  overScan = 3,
}: Args) => {
  const [scrollTop, setScrollTop] = useState(0);

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

  const { virtualItems } = useMemo(() => {
    const rangeStart = scrollTop;
    const rangeEnd = scrollTop + listHeight;

    let startIndex = Math.floor(rangeStart / itemHeight);
    let endIndex = Math.ceil(rangeEnd / itemHeight);

    startIndex = Math.max(0, startIndex - overScan);
    endIndex = Math.min(itemsCount - 1, endIndex + overScan);

    const virtualItems = [];

    for (let index = startIndex; index <= endIndex; index++) {
      virtualItems.push({
        index,
        offsetTop: index * itemHeight,
      });
    }
    return { virtualItems };
  }, [scrollTop, listHeight, itemsCount]);

  const totalHeight = itemHeight * itemsCount;

  return {
    virtualItems,
    totalHeight,
  };
};
