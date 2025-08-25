import { useState, useEffect } from 'react';

export const useTimer = ({ duration, step }: { duration: number; step: number }) => {
  const [seconds, setSeconds] = useState(0);
  const [start, setStart] = useState(seconds > 0);
  useEffect(() => {
    if (!start) return;
    const interval = setInterval(() => {
      // autoClear
      if (seconds >= duration || !start) {
        setSeconds(0);
        setStart(false);
        clearInterval(interval);
      }
      setSeconds((prevSeconds) => prevSeconds + step);
    }, step * 1000);

    return () => clearInterval(interval);
  }, [duration, seconds, start, step]);

  const resetTimer = () => {
    setSeconds(0);
    setStart(false);
  };
  const startTimer = () => {
    setStart(true);
  };
  const stopTimer = () => {
    setStart(true);
  };
  return { seconds, resetTimer, startTimer, isRunning: start, stopTimer };
};
