import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

export const formatMoney = (money: number) => {
  return (money / 100).toFixed(2);
};
