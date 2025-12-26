import { I18nCommonKey } from '@/types/i18next';
import { useMessage } from '@sealos/ui';
import { addHours, format, set, startOfDay } from 'date-fns';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useTranslation } from 'next-i18next';
import { DBTypeEnum } from '@/constants/db';

dayjs.extend(utc);
dayjs.extend(timezone);
import yaml from 'js-yaml';
import ini from 'ini';
import { DBType, PodDetailType } from '@/types/db';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).tz('Asia/Shanghai').format(format);
};

/**
 * copy text data
 */
export const useCopyData = () => {
  const { message: toast } = useMessage();
  const { t } = useTranslation();

  return {
    copyData: (data: string, title: I18nCommonKey = 'copy_success') => {
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
          title: t('copy_failed'),
          status: 'error'
        });
      }
    }
  };
};

/**
 * A hook that provides clipboard functionality with error handling and i18n support.
 *
 * @returns {Object} An object containing clipboard utility functions
 * @returns {Function} getClipboardData - Async function to read text from clipboard
 * @throws {Error} When clipboard API is not supported or permission is denied
 *
 * @example
 * const { getClipboardData } = useClipboard();
 * const text = await getClipboardData();
 */
export const useClipboard = () => {
  const { message: toast } = useMessage();
  const { t } = useTranslation();

  return {
    getClipboardData: async () => {
      try {
        if (!navigator.clipboard) {
          toast({
            title: t('clipboard_unsupported'),
            status: 'error'
          });
          return;
        }

        const clipboardData = await navigator.clipboard.readText();
        return clipboardData;
      } catch (error) {
        console.error(error);
        toast({
          title: t('clipboard_read_failed'),
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
 * Format CPU value to standard C format
 * @param cpu CPU value, like "500m", "1", "2"
 * @returns Standardized CPU value with C suffix, like "0.5C", "1C", "2C"
 */
export const cpuFormatToC = (cpu: string | number = '0'): string => {
  if (!cpu || cpu === '0') {
    return '0C';
  }

  let value: number;
  const cpuStr = cpu.toString();

  if (/m$/i.test(cpuStr)) {
    // Handle values with 'm' suffix, like "500m"
    value = parseFloat(cpuStr) / 1000;
  } else {
    // Handle values without unit, like "1", "2"
    value = parseFloat(cpuStr);
  }

  return `${value.toFixed(1)}C`;
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
 * Format memory value to standard Gi format
 * @param memory Memory value, like "512Mi", "1Gi", "2048Mi"
 * @returns Standardized memory value with Gi suffix, like "0.5Gi", "1Gi", "2Gi"
 */
export const memoryFormatToGi = (memory: string | number = '0'): string => {
  if (!memory || memory === '0') {
    return '0Gi';
  }

  let value: number;
  const memoryStr = memory.toString();

  if (/Mi$/i.test(memoryStr)) {
    // Convert Mi to Gi
    value = parseFloat(memoryStr) / 1024;
  } else if (/Gi$/i.test(memoryStr)) {
    // Already in Gi
    value = parseFloat(memoryStr);
  } else if (/Ti$/i.test(memoryStr)) {
    // Convert Ti to Gi
    value = parseFloat(memoryStr) * 1024;
  } else if (/Ki$/i.test(memoryStr)) {
    // Convert Ki to Gi
    value = parseFloat(memoryStr) / 1024 / 1024;
  } else {
    // Assume the value is in bytes and convert to Gi
    value = parseFloat(memoryStr) / 1024 / 1024 / 1024;
  }

  return `${value.toFixed(1)}Gi`;
};

/**
 * storage format
 */
export const storageFormatToNum = (storage = '0') => {
  return +`${storage.replace(/gi/i, '')}`;
};

/**
 * Parse storage value to Gi units
 * @param value Storage value string
 * @param defaultValue Default value if parsing fails
 * @returns Storage value in Gi units
 */
export const storageFormatToGi = (value: string | undefined, defaultValue: number = 0): number => {
  if (!value) return defaultValue;

  const valueStr = value.toString();
  let numValue: number;

  if (valueStr.endsWith('Gi')) {
    numValue = parseFloat(valueStr.slice(0, -2));
  } else if (valueStr.endsWith('Mi')) {
    numValue = parseInt(valueStr.slice(0, -2)) / 1024;
  } else if (valueStr.endsWith('Ti')) {
    numValue = parseFloat(valueStr.slice(0, -2)) * 1024;
  } else if (valueStr.endsWith('G')) {
    numValue = parseFloat(valueStr.slice(0, -1));
  } else if (valueStr.endsWith('M')) {
    numValue = parseInt(valueStr.slice(0, -1)) / 1024;
  } else if (valueStr.endsWith('T')) {
    numValue = parseFloat(valueStr.slice(0, -1)) * 1024;
  } else {
    numValue = parseFloat(valueStr);
  }

  return isNaN(numValue) ? defaultValue : numValue;
};

/**
 * print memory to Mi of Gi
 */
export const printMemory = (val: number) => {
  const formatValue = (num: number) => {
    const fixed = Number(num.toFixed(1));
    return fixed % 1 === 0 ? fixed.toString() : fixed.toString();
  };
  return val >= 1024 ? `${formatValue(val / 1024)} Gi` : `${formatValue(val)} Mi`;
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
}

export const getErrText = (err: any, def = '') => {
  const msg = typeof err === 'string' ? err : err?.message || def || '';
  msg && console.log('error =>', msg);
  return msg;
};

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve('');
    }, ms);
  });

export const convertCronTime = (cronTime: string, offset: 8 | -8) => {
  let [minute, hour, dayOfMonth, month, dayOfWeek] = cronTime.split(' ');

  if (hour === '*') return cronTime;

  const cronDate = set(startOfDay(new Date()), { hours: +hour, minutes: +minute });

  const newCronDate = addHours(cronDate, offset);

  // 更新 cron 时间表达式的各个部分
  minute = format(newCronDate, 'mm');
  hour = format(newCronDate, 'HH');

  // 处理星期几
  const daysOfWeek =
    dayOfWeek === '*'
      ? [dayOfWeek]
      : dayOfWeek.split(',').map((day) => {
          if (offset < 0) {
            const newDay = +day + (+hour >= 16 ? -1 : 0);
            return newDay === -1 ? '7' : String(newDay);
          }
          const newDay = +day + (+hour < 8 ? 1 : 0);
          return newDay === 7 ? '0' : String(newDay);
        });

  return `${minute} ${hour} ${dayOfMonth} ${month} ${daysOfWeek.join(',')}`;
};

// convertBytes 1024
export const convertBytes = (bytes: number, unit: 'kb' | 'mb' | 'gb' | 'tb') => {
  switch (unit.toLowerCase()) {
    case 'kb':
      return bytes / 1024;
    case 'mb':
      return bytes / Math.pow(1024, 2);
    case 'gb':
      return bytes / Math.pow(1024, 3);
    case 'tb':
      return bytes / Math.pow(1024, 4);
    default:
      return bytes;
  }
};

// formatTime second to day, hour or minute
export const formatTimeToDay = (seconds: number): { time: string; unit: I18nCommonKey } => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(seconds / (3600 * 24));

  if (days > 0) {
    return {
      unit: 'Day',
      time: (seconds / (3600 * 24)).toFixed(1)
    };
  } else if (hours > 0) {
    return {
      unit: 'Hour',
      time: (seconds / 3600).toFixed(1)
    };
  } else {
    return {
      unit: 'start_minute',
      time: (seconds / 60).toFixed(1)
    };
  }
};

export function encodeToHex(input: string) {
  const encoded = Buffer.from(input).toString('hex');
  return encoded;
}

export function decodeFromHex(encoded: string) {
  const decoded = Buffer.from(encoded, 'hex').toString('utf-8');
  return decoded;
}

export const parseConfig = ({
  type,
  configString
}: {
  type: 'ini' | 'yaml';
  configString: string;
}): Object => {
  if (type === 'ini') {
    return ini.parse(configString);
  } else if (type === 'yaml') {
    return yaml.load(configString) as Object;
  } else {
    throw new Error(`Unsupported config type: ${type}`);
  }
};

export const flattenObject = (ob: any, prefix: string = ''): { key: string; value: string }[] => {
  const result: { key: string; value: string }[] = [];

  for (const i in ob) {
    const key = prefix ? `${prefix}.${i}` : i;
    if (typeof ob[i] === 'object' && ob[i] !== null) {
      result.push(...flattenObject(ob[i], key));
    } else {
      result.push({ key, value: String(ob[i]) });
    }
  }

  return result;
};

export const adjustDifferencesForIni = (
  differences: { path: string; oldValue: any; newValue: any }[],
  type: 'ini' | 'yaml',
  dbType: DBType
): { path: string; newValue: string; oldValue: string }[] => {
  if (type !== 'ini' || dbType === 'postgresql') {
    return differences;
  }
  return differences.map((diff) => {
    const pathParts = diff.path.split('.');
    const adjustedPath = pathParts.slice(1).join('.');
    return {
      path: adjustedPath,
      newValue: diff.newValue,
      oldValue: diff.oldValue
    };
  });
};

export const formatMoney = (mone: number) => {
  return mone / 1000000;
};

/**
 * Formats a number by rounding to 2 decimal places and removing trailing zeros
 * @param num - The number to format
 * @returns The formatted number as a string
 */
export function formatNumber(num: number) {
  let rounded = Math.round(num * 100) / 100;
  let str = rounded.toString();
  if (str.indexOf('.') === -1) {
    return str;
  } else {
    return str.replaceAll('0', '');
  }
}

/**
 * Parses a database connection URL string into its components
 * @param url - The database connection URL to parse
 * @returns An object containing the parsed URL components:
 *          - protocol: The URL protocol without trailing colon
 *          - hostname: The host name
 *          - port: The port number
 *          - username: The username for authentication
 *          - password: The password for authentication
 *          - pathname: The database name without leading slash
 * @throws {Error} When the URL format is invalid
 */
export function parseDatabaseUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    return {
      protocol: parsedUrl.protocol.slice(0, -1),
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      username: parsedUrl.username,
      password: parsedUrl.password,
      pathname: parsedUrl.pathname.substring(1)
    };
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

enum MasterRoleName {
  master = 'master',
  primary = 'primary',
  leader = 'leader'
}

enum SlaveRoleName {
  slave = 'slave',
  secondary = 'secondary',
  follower = 'follower'
}

type PodRoleName = `${MasterRoleName | SlaveRoleName}`;

export function getPodRoleName(pod: PodDetailType): {
  role: PodRoleName;
  isMaster: boolean;
  isCreating: boolean;
} {
  if (pod?.metadata?.labels !== undefined) {
    const role = pod.metadata.labels['kubeblocks.io/role'] as PodRoleName;
    if (role !== undefined) {
      return {
        role,
        isMaster:
          role === MasterRoleName.master ||
          role === MasterRoleName.primary ||
          role === MasterRoleName.leader,
        isCreating: false
      };
    }
  }
  return {
    role: 'slave',
    isMaster: false,
    isCreating: true
  };
}

export const getScore = (dbType: DBType, cpu: number, memory: number) => {
  const cpuCores = cpu / 1000; // cpu in cores
  const memoryGB = memory / 1024; // memory in GB
  let score = 0;
  if (
    dbType === DBTypeEnum.postgresql ||
    dbType === DBTypeEnum.mongodb ||
    dbType === DBTypeEnum.mysql
  ) {
    score = Math.min(cpuCores * 400 + memoryGB * 300, 100000);
  } else if (dbType === DBTypeEnum.redis) {
    score = Math.min(cpuCores * 1000 + memoryGB * 500, 100000);
  }
  return Math.floor(score);
};

export type RequiredByKeys<T, K extends keyof T> = {
  [P in K]-?: T[P];
} & Pick<T, Exclude<keyof T, K>>;
