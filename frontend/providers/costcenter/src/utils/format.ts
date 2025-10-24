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

export const formatTrafficAuto = (mb: number, decimals: number = 0): string => {
  if (mb === 0) return '0 MB Traffic';

  if (mb < 1) {
    return `${(mb * 1024).toFixed(decimals)} KB Traffic`;
  } else if (mb < 1024) {
    return `${mb.toFixed(decimals)} MB Traffic`;
  } else if (mb < 1024 * 1024) {
    return `${(mb / 1024).toFixed(decimals)} GB Traffic`;
  } else {
    return `${(mb / (1024 * 1024)).toFixed(decimals)} TB Traffic`;
  }
};
