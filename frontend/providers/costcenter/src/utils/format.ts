import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Quantity } from '@sealos/shared';

// 1¥=1000000
export const formatMoney = (money: number) => money / 1000000;
export const deFormatMoney = (money: number) => money * 1000000;
export const displayMoney = (money: number) => money.toFixed(2);

export const formatTime = (time: string | number | Date, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
  const date = typeof time === 'string' ? parseISO(time) : time;
  return format(date, formatStr, { locale: zhCN });
};

/** Format traffic (binary MB, i.e. MiB) using Quantity BinarySI; appends " Traffic". */
export const formatTrafficAuto = (mb: number, decimals: number = 0): string => {
  if (mb === 0) return '0 Traffic';
  const bytes = BigInt(Math.round(mb * 1024 * 1024));
  const q = Quantity.newQuantity(bytes, 'BinarySI');
  return `${q.formatForDisplay({ format: 'BinarySI', digits: decimals })} Traffic`;
};
