import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

export const getRemainingTime = (expirationTime: number) => {
  const currentTime = Math.floor(Date.now() / 1000);

  if (currentTime >= expirationTime) {
    return 'expired';
  }

  const remainingTimeInSeconds = expirationTime - currentTime;
  const hours = Math.floor(remainingTimeInSeconds / 3600);
  const minutes = Math.floor((remainingTimeInSeconds % 3600) / 60);
  const seconds = remainingTimeInSeconds % 60;

  const formattedTime = `${hours}小时${minutes}分钟`;
  return formattedTime;
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
    const blobToBase64 = (blob: Blob) =>
      new Promise((resolve, reject) => {
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

export const getFavorable =
  (steps: number[] = [], ratios: number[] = []) =>
  (amount: number) => {
    let ratio = 0;

    const step = [...steps].reverse().findIndex((step) => amount >= step);
    if (ratios.length > step && step > -1) ratio = [...ratios].reverse()[step];
    return Math.floor((amount * ratio) / 100);
  };

export const retrySerially = <T>(fn: () => Promise<T>, times: number) =>
  new Promise((res, rej) => {
    let retries = 0;
    const attempt = () => {
      fn()
        .then((_res) => {
          res(_res);
        })
        .catch((error) => {
          retries++;
          console.log(`Attempt ${retries} failed: ${error}`);
          retries < times ? attempt() : rej(error);
        });
    };
    attempt();
  });

// Base64 编码函数
export function base64Encode(str: string) {
  const encodedBuffer = Buffer.from(str, 'binary').toString('base64');
  return encodedBuffer;
}

// Base64 解码函数
export function base64Decode(str: string) {
  const decodedBuffer = Buffer.from(str, 'base64').toString('binary');
  return decodedBuffer;
}

// 1¥=100
export const formatMoney = (money: number) => {
  return money / 100;
};

export const deFormatMoney = (money: number) => money * 100;
