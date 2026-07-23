import { useState, useEffect } from 'react';
import { throttle } from 'lodash';

export function useScreen() {
  const [screenWidth, setScreenWidth] = useState(1440);

  useEffect(() => {
    const resize = throttle(() => {
      const w = document.documentElement.clientWidth;
      setScreenWidth(w);
    }, 300);
    window.addEventListener('resize', resize);

    const w = document.documentElement.clientWidth;
    setScreenWidth(w);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return {
    screenWidth
  };
}
