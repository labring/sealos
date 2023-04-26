import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

// 1¥=10000
export const formatMoney = (money: number) => {
  return (money / 10000).toFixed(2);
};

export function formatUrl(url: string, query: Record<string, string>) {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);

  // 添加新的查询参数
  for (const key in query) {
    if (query.hasOwnProperty(key)) {
      params.set(key, query[key]);
    }
  }

  // 将查询参数加回到 URL 中
  urlObj.search = params.toString();

  return urlObj.toString();
}
