import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

// formatTime second to day, hour or minute
export const formatTimeToDay = (seconds: number): { time: string; unit: string } => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(seconds / (3600 * 24));

  if (days > 0) {
    return {
      unit: 'Day',
      time: (seconds / (3600 * 24)).toFixed(1)
    };
  } else if (hours > 0) {
    return {
      unit: 'Hour',
      time: (seconds / 3600).toFixed(1)
    };
  } else {
    return {
      unit: 'Start Minute',
      time: (seconds / 60).toFixed(1)
    };
  }
};
