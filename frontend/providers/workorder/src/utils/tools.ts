import { useToast } from '@/hooks/useToast';
import { addHours, format, set, startOfDay } from 'date-fns';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

export function addHoursToTime(inputTimeStr: string, hoursToAdd = 8) {
  const inputTime = new Date(inputTimeStr);
  inputTime.setHours(inputTime.getHours() + hoursToAdd);
  return formatTime(inputTime);
}
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
 * format pod createTime
 */
export const formatPodTime = (createTimeStamp: Date = new Date()) => {
  const podStartTimeStamp = dayjs(createTimeStamp);

  let timeDiff = Math.floor(dayjs().diff(podStartTimeStamp) / 1000);

  const days = Math.floor(timeDiff / (24 * 60 * 60));
  timeDiff -= days * 24 * 60 * 60;

  const hours = Math.floor(timeDiff / (60 * 60));
  timeDiff -= hours * 60 * 60;

  const minutes = Math.floor(timeDiff / 60);
  timeDiff -= minutes * 60;

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

export function downLoadBold(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

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

  minute = format(newCronDate, 'mm');
  hour = format(newCronDate, 'HH');

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
export const formatTimeToDay = (seconds: number): { time: string; unit: string } => {
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
      unit: 'Start Minute',
      time: (seconds / 60).toFixed(1)
    };
  }
};

export const obj2Query = (obj: Record<string, string | number>) => {
  let str = '';
  Object.entries(obj).forEach(([key, val]) => {
    if (val) {
      str += `${key}=${val}&`;
    }
  });

  return str.slice(0, str.length - 1);
};
