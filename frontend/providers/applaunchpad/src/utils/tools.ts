import dayjs from 'dayjs';
import { useToast } from '@/hooks/useToast';
import { AppEditType } from '@/types/app';
import { defaultEditVal } from '@/constants/editApp';
import yaml from 'js-yaml';
import { DeployKindsType } from '@/types/app';
import type { AppPatchPropsType } from '@/types/app';
import { YamlKindEnum } from './adapt';
import { useTranslation } from 'next-i18next';

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
 * atob secret yaml
 */
export const atobSecretYaml = (secret?: string): AppEditType['secret'] => {
  if (!secret) return defaultEditVal.secret;
  try {
    const secretData = JSON.parse(window.atob(secret)).auths;
    const serverAddress = Object.keys(secretData)[0];

    return {
      serverAddress,
      username: secretData[serverAddress].username,
      password: secretData[serverAddress].password,
      use: true
    };
  } catch (error) {
    console.log(error);
  }
  return defaultEditVal.secret;
};

/**
 * cpu format
 */
export const cpuFormatToM = (cpu: string) => {
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
export const memoryFormatToMi = (memory: string) => {
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

/**
 * patch yamlList and get action
 */
export const patchYamlList = (oldYamlList: string[], newYamlList: string[]) => {
  const oldJsonYaml = oldYamlList.map((item) => yaml.loadAll(item)).flat() as DeployKindsType[];
  const newJsonYaml = newYamlList.map((item) => yaml.loadAll(item)).flat() as DeployKindsType[];

  const actions: AppPatchPropsType = [];

  // find delete
  oldJsonYaml.forEach((oldYaml) => {
    const item = newJsonYaml.find((item) => item.kind === oldYaml.kind);
    if (!item) {
      actions.push({
        type: 'delete',
        kind: oldYaml.kind as `${YamlKindEnum}`
      });
    }
  });
  // find create and patch
  newJsonYaml.forEach((newYaml) => {
    const patchYaml = oldJsonYaml.find((item) => item.kind === newYaml.kind);
    if (patchYaml) {
      actions.push({
        type: 'patch',
        kind: newYaml.kind as `${YamlKindEnum}`,
        value: newYaml
      });
    } else {
      actions.push({
        type: 'create',
        kind: newYaml.kind as `${YamlKindEnum}`,
        value: yaml.dump(newYaml)
      });
    }
  });

  return actions;
};
