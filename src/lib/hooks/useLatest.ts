import { useInsertionEffect, useRef } from "react";

export const useLatest = <Value>(value: Value) => {
  const valueRef = useRef(value);

  useInsertionEffect(() => {
    valueRef.current = value;
  });

  return valueRef;
};
