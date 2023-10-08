import { isNumber } from "../sharedUtils";

export type AnyFunction = (...args: any[]) => any;
export const rafThrottle = <Fn extends AnyFunction>(cb: Fn) => {
  let rafId: number | null = null;
  let latestArgs: Parameters<Fn>;

  return function throttled(...args: Parameters<Fn>) {
    latestArgs = args;

    if (isNumber(rafId)) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      cb(...latestArgs);
      rafId = null;
    });
  };
};
