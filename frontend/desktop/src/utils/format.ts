import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};
export const k8sFormatTime = (time: string | number | Date) => {
  return dayjs(time).format("TYYMM-DDTHH-mm-ss");
}
// 1¥=10000
export const formatMoney = (money: number) => {
  return (money / 1000000)
};
export const deFormatMoney = (money: number) => (money * 1000000)

export function formatUrl(url: string, query: Record<string, string>) {
  const urlObj = new URL(url);
  // 添加新的查询参数
  for (const key in query) {
  urlObj.searchParams.append(key, query[key]);
  }
  return urlObj.toString();
}
