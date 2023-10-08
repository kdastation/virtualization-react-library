let rafScheduled = false;
const tasks: (() => void)[] = [];

export const scheduleDOMUpdate = (cb: () => void) => {
  tasks.push(cb);
  if (rafScheduled) {
    return;
  }
  rafScheduled = true;
  requestAnimationFrame(() => {
    const tasksToRun = tasks.slice();
    tasks.length = 0;
    tasksToRun.forEach((task) => task());
    rafScheduled = false;
  });
};
