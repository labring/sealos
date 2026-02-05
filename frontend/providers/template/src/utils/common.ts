import dayjs from 'dayjs';
import { cloneDeep, forEach, isNumber, isBoolean, isObject, has } from 'lodash';
import { templateDeployKey } from '@/constants/keys';
import { EnvResponse } from '@/types';

/**
 * format string to number or ''
 */
export const str2Num = (str?: string | number) => {
  return !!str ? +str : '';
};

/**
 * add ./ in path
 */
export const pathFormat = (str: string) => {
  if (str.startsWith('/')) return `.${str}`;
  return `./${str}`;
};
export const pathToNameFormat = (str: string) => {
  return str.replace(/(\/|\.)/g, 'vn-').toLocaleLowerCase();
};

/**
 * cpu format
 */
export const cpuFormatToM = (cpu = '0') => {
  if (!cpu || cpu === '0') {
    return 0;
  }
  let value = parseFloat(cpu);

  if (/n/gi.test(cpu)) {
    value = value / 1000 / 1000;
  } else if (/u/gi.test(cpu)) {
    value = value / 1000;
  } else if (/m/gi.test(cpu)) {
    value = value;
  } else {
    value = value * 1000;
  }
  if (value < 0.1) return 0;
  return Number(value.toFixed(4));
};

/**
 * memory format
 */
export const memoryFormatToMi = (memory = '0') => {
  if (!memory || memory === '0') {
    return 0;
  }

  let value = parseFloat(memory);

  if (/Ki/gi.test(memory)) {
    value = value / 1024;
  } else if (/Mi/gi.test(memory)) {
    value = value;
  } else if (/Gi/gi.test(memory)) {
    value = value * 1024;
  } else if (/Ti/gi.test(memory)) {
    value = value * 1024 * 1024;
  } else {
    console.log('Invalid memory value');
    value = 0;
  }

  return Number(value.toFixed(2));
};

/**
 * print memory to Mi of Gi
 */
export const printMemory = (val: number) => {
  return val >= 1024 ? `${val / 1024} Gi` : `${val} Mi`;
};

/**
 * format pod createTime
 */
export const formatPodTime = (createTimeStamp: Date = new Date()) => {
  const podStartTimeStamp = dayjs(createTimeStamp);

  let timeDiff = Math.floor(dayjs().diff(podStartTimeStamp) / 1000);

  // 计算天数
  const days = Math.floor(timeDiff / (24 * 60 * 60));
  timeDiff -= days * 24 * 60 * 60;

  // 计算小时数
  const hours = Math.floor(timeDiff / (60 * 60));
  timeDiff -= hours * 60 * 60;

  // 计算分钟数
  const minutes = Math.floor(timeDiff / 60);
  timeDiff -= minutes * 60;

  // 计算秒数
  const seconds = timeDiff;

  if (days > 0) {
    return `${days}d${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }
  return `${seconds}s`;
};

export const parseGithubUrl = (url: string) => {
  if (!url) return null;
  let urlObj = new URL(url);
  let pathParts = urlObj.pathname.split('/');

  return {
    hostname: urlObj.hostname,
    organization: pathParts[1],
    repository: pathParts[2],
    branch: pathParts[3],
    remainingPath: pathParts.slice(4).join('/') + urlObj.search
  };
};

export const processEnvValue = (obj: any, labelName: string) => {
  const newDeployment = cloneDeep(obj);

  forEach(newDeployment?.spec?.template?.spec?.containers, (container) => {
    forEach(container?.env, (env) => {
      if (isObject(env.value)) {
        env.value = JSON.stringify(env.value);
      } else if (isNumber(env.value) || isBoolean(env.value)) {
        env.value = env.value.toString();
      }
    });
  });

  if (labelName) {
    newDeployment.metadata = newDeployment.metadata || {};
    newDeployment.metadata.labels = newDeployment.metadata.labels || {};
    newDeployment.metadata.labels[templateDeployKey] = labelName;
  }

  return newDeployment;
};

export function deepSearch(obj: any): string {
  if (has(obj, 'message')) {
    return obj.message;
  }
  for (let key in obj) {
    if (isObject(obj[key])) {
      let message = deepSearch(obj[key]);
      if (message) {
        return message;
      }
    }
  }
  return 'Error';
}

export const formatStarNumber = (number: number) => {
  if (number < 1000) {
    return number.toString();
  } else if (number < 10000) {
    const thousands = Math.floor(number / 1000);
    const remainder = number % 1000;
    return `${thousands}.${remainder.toString()[0]}k`;
  } else {
    return (number / 1000).toFixed(1) + 'k';
  }
};

export function compareFirstLanguages(acceptLanguageHeader: string) {
  const indexOfZh = acceptLanguageHeader.indexOf('zh');
  const indexOfEn = acceptLanguageHeader.indexOf('en');
  if (indexOfZh === -1) return 'en';
  if (indexOfEn === -1 || indexOfZh < indexOfEn) return 'zh';
  return 'en';
}

export function getTemplateEnvs(namespace?: string): EnvResponse {
  const TemplateEnvs: EnvResponse = {
    SEALOS_CLOUD_DOMAIN:
      process.env.SEALOS_USER_DOMAIN || process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io',
    SEALOS_CERT_SECRET_NAME: process.env.SEALOS_CERT_SECRET_NAME || 'wildcard-cert',
    TEMPLATE_REPO_URL:
      process.env.TEMPLATE_REPO_URL || 'https://github.com/labring-actions/templates',
    TEMPLATE_REPO_BRANCH: process.env.TEMPLATE_REPO_BRANCH || 'main',
    SEALOS_NAMESPACE: namespace || '',
    SEALOS_SERVICE_ACCOUNT: namespace?.replace('ns-', '') || '',
    SHOW_AUTHOR: process.env.SHOW_AUTHOR || 'false',
    DESKTOP_DOMAIN: process.env.DESKTOP_DOMAIN || 'cloud.sealos.io',
    CURRENCY_SYMBOL: (process.env.CURRENCY_SYMBOL as 'shellCoin' | 'cny' | 'usd') || 'shellCoin',
    FORCED_LANGUAGE: process.env.FORCED_LANGUAGE || 'en'
  };
  return TemplateEnvs;
}

export const formatMoney = (mone: number) => {
  return mone / 1000000;
};
