import dayjs from 'dayjs';
import { useToast } from '@/hooks/useToast';
import { AppEditType } from '@/types/app';
import { defaultEditVal } from '@/constants/editApp';
import yaml from 'js-yaml';
import { DeployKindsType } from '@/types/app';
import type { AppPatchPropsType } from '@/types/app';
import { YamlKindEnum } from './adapt';
import { useTranslation } from 'next-i18next';
import * as jsonpatch from 'fast-json-patch';

export function formatSize(size: number, fixedNumber = 2) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = 0;
  while (size >= 1024) {
    size /= 1024;
    i++;
  }
  return size.toFixed(fixedNumber) + ' ' + units[i];
}

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

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
  const endsWithSlash = str.endsWith('/');
  const withoutTrailingSlash = endsWithSlash ? str.slice(0, -1) : str;
  const replacedStr = withoutTrailingSlash.replace(/_/g, '-').replace(/[\/.]/g, 'vn-');

  return endsWithSlash ? replacedStr : replacedStr.toLowerCase();
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
export const patchYamlList = ({
  parsedOldYamlList,
  parsedNewYamlList,
  originalYamlList
}: {
  parsedOldYamlList: string[];
  parsedNewYamlList: string[];
  originalYamlList: DeployKindsType[];
}) => {
  const oldFormJsonList = parsedOldYamlList
    .map((item) => yaml.loadAll(item))
    .flat() as DeployKindsType[];

  const newFormJsonList = parsedNewYamlList
    .map((item) => yaml.loadAll(item))
    .flat() as DeployKindsType[];

  const actions: AppPatchPropsType = [];

  // find delete
  oldFormJsonList.forEach((oldYamlJson) => {
    const item = newFormJsonList.find(
      (item) => item.kind === oldYamlJson.kind && item.metadata?.name === oldYamlJson.metadata?.name
    );
    if (!item && oldYamlJson.metadata?.name) {
      actions.push({
        type: 'delete',
        kind: oldYamlJson.kind as `${YamlKindEnum}`,
        name: oldYamlJson.metadata?.name
      });
    }
  });

  // find create and patch
  newFormJsonList.forEach((newYamlJson) => {
    const oldFormJson = oldFormJsonList.find(
      (item) =>
        item.kind === newYamlJson.kind && item?.metadata?.name === newYamlJson?.metadata?.name
    );

    if (oldFormJson) {
      const patchRes = jsonpatch.compare(oldFormJson, newYamlJson);

      if (patchRes.length === 0) return;

      /* Generate a new json using the formPatchResult and the crJson */
      const actionsJson = (() => {
        try {
          /* find cr json */
          let crOldYamlJson = originalYamlList.find(
            (item) =>
              item.kind === oldFormJson?.kind &&
              item?.metadata?.name === oldFormJson?.metadata?.name
          );

          if (!crOldYamlJson) return newYamlJson;
          crOldYamlJson = JSON.parse(JSON.stringify(crOldYamlJson));

          if (!crOldYamlJson) return newYamlJson;

          /* Fill in volumn */
          if (
            oldFormJson.kind === YamlKindEnum.Deployment ||
            oldFormJson.kind === YamlKindEnum.StatefulSet
          ) {
            // @ts-ignore
            crOldYamlJson.spec.template.spec.volumes = oldFormJson.spec.template.spec.volumes;
            // @ts-ignore
            crOldYamlJson.spec.template.spec.containers[0].volumeMounts =
              // @ts-ignore
              oldFormJson.spec.template.spec.containers[0].volumeMounts;
            // @ts-ignore
            crOldYamlJson.spec.volumeClaimTemplates = oldFormJson.spec.volumeClaimTemplates;
          }

          /* generate new json */
          const _patchRes: jsonpatch.Operation[] = patchRes
            .map((item) => {
              let jsonPatchError = jsonpatch.validate([item], crOldYamlJson);
              if (jsonPatchError?.name === 'OPERATION_PATH_UNRESOLVABLE') {
                switch (item.op) {
                  case 'add':
                  case 'replace':
                    return {
                      ...item,
                      op: 'add' as const,
                      value: item.value ?? ''
                    };
                  default:
                    return null;
                }
              }
              return item;
            })
            .filter((op): op is jsonpatch.Operation => op !== null);

          const patchResYamlJson = jsonpatch.applyPatch(crOldYamlJson, _patchRes, true).newDocument;

          // delete invalid field
          // @ts-ignore
          delete patchResYamlJson.status;
          patchResYamlJson.metadata = {
            name: patchResYamlJson.metadata?.name,
            namespace: patchResYamlJson.metadata?.namespace,
            labels: patchResYamlJson.metadata?.labels,
            annotations: patchResYamlJson.metadata?.annotations,
            ownerReferences: patchResYamlJson.metadata?.ownerReferences,
            finalizers: patchResYamlJson.metadata?.finalizers
          };

          return patchResYamlJson;
        } catch (error) {
          console.error('ACTIONS JSON ERROR:\n', error);
          return newYamlJson;
        }
      })();

      // adapt deployment,statefulset,service ports
      if (
        actionsJson.kind === YamlKindEnum.Deployment ||
        actionsJson.kind === YamlKindEnum.StatefulSet
      ) {
        // @ts-ignore
        const ports = actionsJson?.spec.template.spec.containers[0].ports || [];
        if (ports.length > 1 && !ports[0]?.name) {
          // @ts-ignore
          actionsJson.spec.template.spec.containers[0].ports[0].name = 'adaptport';
        }
      }
      if (actionsJson.kind === YamlKindEnum.Service) {
        // @ts-ignore
        const ports = actionsJson?.spec.ports || [];
        console.log(ports);

        // @ts-ignore
        if (ports.length > 1 && !ports[0]?.name) {
          // @ts-ignore
          actionsJson.spec.ports[0].name = 'adaptport';
        }
      }

      console.log('patch result:', oldFormJson.metadata?.name, oldFormJson.kind, actionsJson);

      actions.push({
        type: 'patch',
        kind: newYamlJson.kind as `${YamlKindEnum}`,
        value: actionsJson as any
      });
    } else {
      actions.push({
        type: 'create',
        kind: newYamlJson.kind as `${YamlKindEnum}`,
        value: yaml.dump(newYamlJson)
      });
    }
  });

  return actions;
};

/* request number limit */
export class RequestController {
  results: any[] = [];
  index = 0;
  runNum = 0;

  tasks: (() => any)[] = [];
  limit = 3;

  async executeTask(index: number): Promise<any> {
    const task = this.tasks[index];

    if (!task) return;
    this.index++;
    this.runNum++;
    try {
      const result = await task();
      this.results[index] = result;
    } catch (error) {
      this.results[index] = error;
    }
    this.runNum--;
    return this.executeTask(this.index);
  }

  stop() {
    this.index = this.tasks.length + 1;
    this.tasks = [];
    this.runNum = this.limit;
  }

  async runTasks({ tasks, limit }: { tasks: (() => any)[]; limit: number }) {
    this.tasks = tasks;
    this.limit = limit;
    this.index = 0;
    this.runNum = 0;

    const arr = new Array(limit).fill(0);
    await Promise.allSettled(arr.map((_, i) => this.executeTask(i)));

    return this.results;
  }
}

export const isElementInViewport = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  const vertInView = rect.top <= windowHeight && rect.top + rect.height >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;
  return vertInView && horInView;
};

export const getErrText = (err: any, def = '') => {
  const msg: string = typeof err === 'string' ? err : err?.message || def || '';
  msg && console.log('error =>', msg);
  return msg;
};

export const formatMoney = (mone: number) => {
  return mone / 1000000;
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
