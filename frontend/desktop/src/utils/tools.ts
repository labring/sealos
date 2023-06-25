import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

// 1¥=10000
export const formatMoney = (money: number) => {
  return (money / 10000).toFixed(2);
};

export function appWaitSeconds(ms: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
export async function getBase64FromRemote(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const dataUrl = reader.result;
        resolve(dataUrl);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });

    return await blobToBase64(blob);
  } catch {
    return '';
  }
}

export const getFavorable = (amount: number) => {
  let ratio: number;
  switch (true) {
      case amount < 299:
          return 0;
      case amount < 599:
          ratio = 10;
          break;
      case amount < 1999:
          ratio = 15;
          break;
      case amount < 4999:
          ratio = 20;
          break;
      case amount < 19999:
          ratio = 25;
          break;
      default:
          ratio = 30;
  }
  return Math.floor(amount * ratio / 100);
}