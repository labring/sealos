import { Authority } from '@/consts';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'next-i18next';

/**
 * copy text data
 */
export const useCopyData = () => {
  const { toast } = useToast();
  const { t } = useTranslation('tools');

  return {
    copyData: (data: string) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = data;
        document.body.appendChild(textarea);
        textarea.select();
        // ts-ignore
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast({
          title: t('copySuccess'),
          status: 'success',
          duration: 1000
        });
      } catch (error) {
        console.error(error);
        toast({
          title: t('copyFailed'),
          status: 'error'
        });
      }
    }
  };
};
/*
 * format string to number or ''
 */
export const str2Num = (str?: string | number) => {
  return !!str ? +str : 0;
};

/**
 * add ./ in path
 */
export const pathFormat = (str: string) => {
  if (str.startsWith('/')) return `.${str}`;
  return `./${str}`;
};
export const pathToNameFormat = (str: string) => {
  if (!str.startsWith('/')) return str.replace(/(\/|\.)/g, '-').toLocaleLowerCase();
  return str
    .substring(1)
    .replace(/(\/|\.)/g, '-')
    .toLocaleLowerCase();
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
 * storage format
 */
export const storageFormatToNum = (storage = '0') => {
  return +`${storage.replace(/gi/i, '')}`;
};

/**
 * print memory to Mi of Gi
 */
export const printMemory = (val: number) => {
  return val >= 1024 ? `${Math.round(val / 1024)} Gi` : `${val} Mi`;
};

/**
 * 下载文件到本地
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
  link.remove();
}

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve('');
    }, ms);
  });

export const inAuthority = (val: unknown): boolean =>
  Object.values(Authority).includes(val as Authority);
// 1¥=1000000
export const formatMoney = (money: number) => money / 1000000;
export const deFormatMoney = (money: number) => money * 1000000;
export const displayMoney = (money: number) => money.toFixed(2);
export function formatBytes(
  bytes: number,
  decimals = 2
): {
  value: number;
  size: string;
  toString: () => string;
} {
  if (bytes === 0)
    return {
      value: 0,
      size: 'B',
      toString() {
        return '0B';
      }
    };

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return {
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
    size: sizes[i],
    toString() {
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + '' + sizes[i];
    }
  };
}
