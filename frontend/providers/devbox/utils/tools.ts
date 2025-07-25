import dayjs from 'dayjs';
import yaml from 'js-yaml';
import { toast } from 'sonner';
import { customAlphabet } from 'nanoid';
import duration from 'dayjs/plugin/duration';
import * as jsonpatch from 'fast-json-patch';
import { useTranslations } from 'next-intl';

import { YamlKindEnum } from '@/constants/devbox';
import type { DevboxKindsType, DevboxPatchPropsType } from '@/types/devbox';

dayjs.extend(duration);

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
  if (value < 0.1) {
    return 0;
  }
  return Number(value.toFixed(4));
};

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

export const storageFormatToNum = (storage = '0') => {
  return +`${storage.replace(/gi/i, '')}`;
};

export const printMemory = (val: number) => {
  return val >= 1024 ? `${Math.round(val / 1024)} Gi` : `${val} Mi`;
};

export function downLoadBlob(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  link.click();
}

export const obj2Query = (obj: Record<string, string | number>) => {
  let str = '';
  Object.entries(obj).forEach(([key, val]) => {
    if (val) {
      str += `${key}=${val}&`;
    }
  });

  return str.slice(0, str.length - 1);
};

export const useCopyData = () => {
  const t = useTranslations();

  return {
    copyData: async (data: string, title: string = 'copy_success') => {
      try {
        await navigator.clipboard.writeText(data);

        toast.success(t(title));
      } catch (error) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = data;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);

          toast.success(t(title));
        } catch (fallbackError) {
          console.error('Copy failed:', fallbackError);
          toast.error(t('copy_failed'));
        }
      }
    }
  };
};

export const str2Num = (str?: string | number) => {
  return !!str ? +str : 0;
};

export const getErrText = (err: any, def = '') => {
  const msg: string = typeof err === 'string' ? err : err?.message || def || '';
  msg && console.log('error =>', msg);
  return msg;
};

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
  originalYamlList: DevboxKindsType[];
}) => {
  const oldFormJsonList = parsedOldYamlList
    .map((item) => yaml.loadAll(item))
    .flat() as DevboxKindsType[];

  const newFormJsonList = parsedNewYamlList
    .map((item) => yaml.loadAll(item))
    .flat() as DevboxKindsType[];

  const actions: DevboxPatchPropsType = [];

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

      if (patchRes.length === 0) {
        return;
      }

      /* Generate a new json using the formPatchResult and the crJson */
      const actionsJson = (() => {
        try {
          /* find cr json */
          let crOldYamlJson = originalYamlList.find(
            (item) =>
              item.kind === oldFormJson?.kind &&
              item?.metadata?.name === oldFormJson?.metadata?.name
          );

          if (!crOldYamlJson) {
            return newYamlJson;
          }
          crOldYamlJson = JSON.parse(JSON.stringify(crOldYamlJson));

          if (!crOldYamlJson) {
            return newYamlJson;
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

      if (actionsJson.kind === YamlKindEnum.Service) {
        // @ts-ignore
        const ports = actionsJson?.spec.ports || [];

        // @ts-ignore
        if (ports.length > 1 && !ports[0]?.name) {
          // @ts-ignore
          actionsJson.spec.ports[0].name = 'adaptport';
        }
      }

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

export const formatMoney = (mone: number) => {
  return mone / 1000000;
};

export function calculateUptime(createdTime: Date): string {
  const now = dayjs();
  const created = dayjs(createdTime);
  const diff = dayjs.duration(now.diff(created));

  const days = diff.days();
  const hours = diff.hours();
  const minutes = diff.minutes();

  let uptime = '';
  if (days > 0) {
    uptime += `${days}d`;
  }
  if (hours > 0) {
    uptime += `${hours}h`;
  }
  if (minutes > 0) {
    uptime += `${minutes}m`;
  }

  return uptime || 'Recently Started';
}

export const isElementInViewport = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  const vertInView = rect.top <= windowHeight && rect.top + rect.height >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;
  return vertInView && horInView;
};
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const parseTemplateConfig = (config: string) => {
  return JSON.parse(config) as {
    user: string;
    workingDir: string;
    releaseCommand: string[];
    releaseArgs: string[];
    appPorts: {
      name: string;
      port: number;
      protocol: string;
      targetPort: number;
    }[];
    ports: {
      containerPort: number;
      name: string;
      protocol: string;
    }[];
  };
};
