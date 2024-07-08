import { useRef, useCallback } from 'react';

let timer: any, tTimer: number;

/**
 * 节流原理：在一定时间内，只能触发一次
 * @param {Function} func 要执行的回调函数
 * @param {Number} wait 延时的时间
 * @param {Boolean} immediate 是否立即执行
 * @return null
 */
export const throttle = (func: Function, wait = 1000, immediate = true) => {
  if (!tTimer) {
    tTimer = immediate ? 0 : Date.now();
  }
  if (Date.now() - tTimer >= wait) {
    tTimer = Date.now();
    typeof func === 'function' && func();
  }
};

let timeout: any = null;

/**
 * 防抖原理：一定时间内，只有最后一次操作，再过wait毫秒后才执行函数
 * @param {Function} func 要执行的回调函数
 * @param {Number} wait 延时的时间
 * @param {Boolean} immediate 是否立即执行
 * @return null
 */
export const debounce = (func: Function, wait = 1000, immediate = false) => {
  // 清除定时器
  if (timeout !== null) clearTimeout(timeout);
  // 立即执行，此类情况一般用不到
  if (immediate) {
    const callNow = !timeout;

    timeout = setTimeout(function () {
      timeout = null;
    }, wait);
    if (callNow) typeof func === 'function' && func();
  } else {
    // 设置定时器，当最后一次操作后，timeout不会再被清除，所以在延时wait毫秒后执行func回调方法
    timeout = setTimeout(function () {
      typeof func === 'function' && func();
    }, wait);
  }
};

/**
 * 获取DOM距离文档顶部距离
 */
export const getDomOffsetTop = (dom: any) => {
  let offsetTop = 0;

  do {
    offsetTop += dom.offsetTop;
    dom = dom.parentNode;
  } while (dom.parentNode);

  return offsetTop;
};

/**
 * 复制
 */
export function copyData(data: string, showText?: string) {
  const clipboardObj = navigator.clipboard;

  clipboardObj.writeText(data).then(() => {
    showText && alert(showText);
  });
}

export function useThrottle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  const lastCall = useRef(0);
  const lastTimer = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        func(...args);
        lastCall.current = now;
      } else {
        if (lastTimer.current) {
          clearTimeout(lastTimer.current);
        }
        lastTimer.current = setTimeout(() => {
          func(...args);
          lastCall.current = Date.now();
        }, delay - (now - lastCall.current));
      }
    },
    [func, delay]
  ) as T;
}
