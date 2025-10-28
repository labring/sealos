import dayjs from 'dayjs';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};
export const k8sFormatTime = (time: string | number | Date) => {
  return dayjs(time).format('TYYMM-DDTHH-mm-ss');
};
// 1¥=10000
export const formatMoney = (mone: number) => {
  return mone / 1000000;
};
export const deFormatMoney = (money: number) => money * 1000000;

export function formatUrl(url: string, query: Record<string, string>) {
  const urlObj = new URL(url);
  for (const key in query) {
    urlObj.searchParams.append(key, query[key]);
  }
  return urlObj.toString();
}

export const parseOpenappQuery = (openapp: string) => {
  console.log('openapp', openapp);
  let param = decodeURIComponent(openapp);
  const firstQuestionMarkIndex = param.indexOf('?');

  let appkey = '';
  let appPath = '/';
  let appQuery = '';

  if (firstQuestionMarkIndex === -1) {
    // 格式: system-brain
    appkey = param;
  } else {
    // 格式: system-brain?/test/a/b?trialToken=xxxx 或 system-brain?trialToken=xxxx
    appkey = param.substring(0, firstQuestionMarkIndex);
    const remainingPart = param.substring(firstQuestionMarkIndex + 1);

    const secondQuestionMarkIndex = remainingPart.indexOf('?');
    if (secondQuestionMarkIndex === -1) {
      // 格式: system-brain?trialToken=xxxx
      appQuery = remainingPart;
    } else {
      // 格式: system-brain?/test/a/b?trialToken=xxxx
      appPath = remainingPart.substring(0, secondQuestionMarkIndex);
      appQuery = remainingPart.substring(secondQuestionMarkIndex + 1);
    }
  }

  return {
    appkey,
    appPath,
    appQuery
  };
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

export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    return email;
  }

  const username = email.substring(0, atIndex);
  const domain = email.substring(atIndex);

  if (username.length <= 3) {
    return username + '****' + domain;
  }

  const maskedUsername =
    username.substring(0, 3) +
    '*'.repeat(username.length - 4) +
    username.substring(username.length - 1);
  return maskedUsername + domain;
}
