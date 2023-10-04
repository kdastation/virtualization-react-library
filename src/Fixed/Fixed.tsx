import { useCallback, useRef, useState } from "react";
import { useFixedVirtuoso } from "./useFixedVirtuoso";

const createItems = () =>
  Array.from({ length: 10_000 }, (_, index) => ({
    id: Math.random().toString(36).slice(2),
    text: String(index),
  }));

const ITEM_HEIGHT = 60;
const CONTAINER_HEIGHT = 600;

export const Fixed = () => {
  const [listItems, setListItems] = useState(() => createItems());
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalHeight } = useFixedVirtuoso({
    itemHeight: ITEM_HEIGHT,
    itemsCount: listItems.length,
    getScrollElement: useCallback(() => scrollElementRef.current, []),
  });

  return (
    <div style={{ padding: "0 12px" }}>
      <div
        ref={scrollElementRef}
        style={{
          maxHeight: CONTAINER_HEIGHT,
          overflow: "auto",
          border: "1px solid lightgrey",
          position: "relative",
        }}
      >
        <div style={{ height: totalHeight }}>
          {virtualItems.map((virtualItem) => {
            const item = listItems[virtualItem.index]!;

            return (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualItem.offsetTop}px)`,
                  height: ITEM_HEIGHT,
                  padding: "6px 12px",
                }}
                key={item.id}
              >
                {item.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
