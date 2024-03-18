import { useToast } from '@/hooks/useToast';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { cloneDeep, forEach, isNumber, isBoolean, isObject, has } from 'lodash';
import { templateDeployKey } from '@/constants/keys';

/**
 * copy text data
 */
export const useCopyData = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  return {
    copyData: (data: string, title: string = 'Copy Success') => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = data;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast({
          title: t(title),
          status: 'success',
          duration: 1000
        });
      } catch (error) {
        console.error(error);
        toast({
          title: t('Copy Failed'),
          status: 'error'
        });
      }
    }
  };
};

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
 * read a file text content
 */
export const reactLocalFileContent = (file: File) => {
  return new Promise((resolve: (_: string) => void, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsText(file);
  });
};

/**
 * str to base64
 */
export const strToBase64 = (str: string) => {
  try {
    const base64 = window.btoa(str);

    return base64;
  } catch (error) {
    console.log(error);
  }
  return '';
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

/**
 * download file
 */
export function downLoadBold(content: BlobPart, type: string, fileName: string) {
  // 创建一个 Blob 对象
  const blob = new Blob([content], { type });

  // 创建一个 URL 对象
  const url = URL.createObjectURL(blob);

  // 创建一个 a 标签
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  // 模拟点击 a 标签下载文件
  link.click();
}

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
