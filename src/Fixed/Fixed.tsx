import { faker } from "@faker-js/faker";
import { useCallback, useRef, useState } from "react";
import { useVirtuoso } from "./useVirtuoso";

const createItems = () =>
  Array.from({ length: 10_000 }, (_, index) => ({
    id: Math.random().toString(36).slice(2),
    text: faker.lorem.text(),
  }));

const CONTAINER_HEIGHT = 600;

export const Fixed = () => {
  const [listItems, setListItems] = useState(() => createItems());
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalHeight, measureElement } = useVirtuoso({
    estimateItemHeight: useCallback(() => 40, []),
    itemsCount: listItems.length,
    getScrollElement: useCallback(() => scrollElementRef.current, []),
    getItemId: useCallback((index) => listItems[index]!.id, [listItems]),
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
                ref={measureElement}
                data-index={virtualItem.index}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualItem.offsetTop}px)`,
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
