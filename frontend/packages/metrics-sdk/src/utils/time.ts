import dayjs from 'dayjs';

export const toSeconds = (value: number | string): number => {
  const num = typeof value === 'string' ? Number(value) : value;
  return Math.abs(num) > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
};

export const formatTimestamp = (timestamp: number): string => {
  return dayjs(timestamp * 1000).format('YYYY/MM/DD HH:mm');
};

export const getTimeRange = (hours: number): { start: number; end: number } => {
  const end = Math.floor(Date.now() / 1000);
  const start = end - hours * 3600;
  return { start, end };
};
