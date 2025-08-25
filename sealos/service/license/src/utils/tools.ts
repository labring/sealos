import { cpuPriceMonth, memoryPriceMonth } from '@/constant/product';
import { ClusterFormType } from '@/types';
import dayjs from 'dayjs';

export const calculatePrice = (form: ClusterFormType, freeValues: ClusterFormType): number => {
  const { cpu, memory, months } = form;

  const cpuTotalPrice = cpuPriceMonth * cpu;
  const memoryTotalPrice = memoryPriceMonth * memory;

  const totalPrice = (cpuTotalPrice + memoryTotalPrice) * parseInt(months);

  if (cpu <= freeValues.cpu && memory <= freeValues.memory && months === freeValues.months) {
    return 0;
  } else {
    return totalPrice;
  }
};

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

export const getRemainingTime = (expirationTime: number) => {
  const currentTime = Math.floor(Date.now() / 1000);

  if (currentTime >= expirationTime) {
    return 'expired';
  }

  const remainingTimeInSeconds = expirationTime - currentTime;
  const days = Math.floor(remainingTimeInSeconds / 86400);
  const hours = Math.floor((remainingTimeInSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingTimeInSeconds % 3600) / 60);

  let formattedTime = '';

  if (days > 0) {
    formattedTime += `${days}天`;
  }

  if (hours > 0) {
    formattedTime += `${hours}小时`;
  }

  if (minutes > 0 && (days === 0 || hours === 0)) {
    formattedTime += `${minutes}分钟`;
  }

  if (formattedTime === '') {
    return '不足一分钟';
  }

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

export function compareFirstLanguages(acceptLanguageHeader: string) {
  const indexOfZh = acceptLanguageHeader.indexOf('zh');
  const indexOfEn = acceptLanguageHeader.indexOf('en');
  if (indexOfZh === -1) return 'en';
  if (indexOfEn === -1 || indexOfZh < indexOfEn) return 'zh';
  return 'en';
}
