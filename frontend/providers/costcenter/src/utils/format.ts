import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
// 1¥=1000000
export const formatMoney = (money: number) => money / 1000000;
export const deFormatMoney = (money: number) => money * 1000000;
export const displayMoney = (money: number) => money.toFixed(2);

export const formatTime = (time: string | number | Date, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
  const date = typeof time === 'string' ? parseISO(time) : time;
  return format(date, formatStr, { locale: zhCN });
};

export const formatRelativeTime = (time: string | number | Date) => {
  const date = typeof time === 'string' ? parseISO(time) : time;
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
};
