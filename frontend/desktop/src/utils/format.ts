import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

// 1¥=10000
export const formatMoney = (money: number) => {
  return (money / 10000).toFixed(2);
};

export function formatUrl(url: string, query: Record<string, string>) {
  let queryStr = '';

  // 添加新的查询参数
  for (const key in query) {
    queryStr += `${key}=${query[key]}&`;
  }

  if (queryStr) {
    return `${url}?${queryStr.slice(0, queryStr.length - 1)}`;
  }
  return url;
}
