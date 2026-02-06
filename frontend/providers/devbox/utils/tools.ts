import dayjs from 'dayjs';
import yaml from 'js-yaml';
import { toast } from 'sonner';
import { customAlphabet } from 'nanoid';
import duration from 'dayjs/plugin/duration';
import * as jsonpatch from 'fast-json-patch';
import { useTranslations } from 'next-intl';

import { YamlKindEnum, gpuTypeAnnotationKey } from '@/constants/devbox';
import type { DevboxKindsType, DevboxPatchPropsType } from '@/types/devbox';

dayjs.extend(duration);

const decodeJsonPointerToken = (token: string) => token.replace(/~1/g, '/').replace(/~0/g, '~');
const isUnsafeProtoKey = (key: string) =>
  key === '__proto__' || key === 'prototype' || key === 'constructor';

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
  } else if (/k/gi.test(cpu)) {
    // k means 1000 cores, convert to millicores: 1k = 1000 * 1000m = 1000000m
    value = value * 1000 * 1000;
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
    value = 0;
  }

  return Number(value.toFixed(2));
};

export const storageFormatToMi = (storage = '0') => {
  if (!storage || storage === '0') {
    return 0;
  }

  let value = parseFloat(storage);

  if (/Ki/gi.test(storage)) {
    value = value / 1024;
  } else if (/Mi/gi.test(storage)) {
    value = value;
  } else if (/Gi/gi.test(storage)) {
    value = value * 1024;
  } else if (/Ti/gi.test(storage)) {
    value = value * 1024 * 1024;
  } else {
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
  let msg: string = typeof err === 'string' ? err : err?.message || def || '';

  // Extract message from "code:message" format
  if (msg.includes(':')) {
    const parts = msg.split(':');
    if (parts.length >= 2) {
      // Get everything after the first colon
      msg = parts.slice(1).join(':').trim();
    }
  }

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
  originalYamlList: DevboxKindsType[] | { filename: string; value: string }[];
}) => {
  const oldFormJsonList = parsedOldYamlList
    .map((item) => yaml.loadAll(item))
    .flat() as DevboxKindsType[];

  const newFormJsonList = parsedNewYamlList
    .map((item) => yaml.loadAll(item))
    .flat() as DevboxKindsType[];

  // Convert originalYamlList to JSON objects if needed
  const originalJsonList = (() => {
    if (originalYamlList.length === 0) return [];
    const first = originalYamlList[0];
    // Check if it's { filename, value } format
    if ('filename' in first && 'value' in first) {
      return (originalYamlList as { filename: string; value: string }[])
        .map((item) => yaml.loadAll(item.value))
        .flat() as DevboxKindsType[];
    }
    return originalYamlList as DevboxKindsType[];
  })();

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
          let crOldYamlJson = originalJsonList.find(
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

          // Handle remove operations for spec fields (e.g., GPU removal)
          // JSON Merge Patch requires explicit null to delete fields
          _patchRes.forEach((op) => {
            if (op.op === 'remove') {
              // Handle removal of entire annotations object (when GPU was the only annotation)
              if (op.path === '/spec/config/annotations' && oldFormJson.kind === YamlKindEnum.Devbox) {
                const oldAnnotations = (oldFormJson as any)?.spec?.config?.annotations;
                if (oldAnnotations?.[gpuTypeAnnotationKey]) {
                  // GPU annotation existed, set it to null explicitly
                  if (!(patchResYamlJson as any).spec.config.annotations) {
                    (patchResYamlJson as any).spec.config.annotations = {};
                  }
                  (patchResYamlJson as any).spec.config.annotations[gpuTypeAnnotationKey] = null;
                }
              } else if (
                op.path.startsWith('/spec/resource/') ||
                op.path.startsWith('/spec/config/annotations/')
              ) {
                // Handle removal of specific fields
                const fieldPath = op.path
                  .split('/')
                  .slice(1)
                  .map(decodeJsonPointerToken);
                if (fieldPath.some(isUnsafeProtoKey)) {
                  return;
                }

                const nullOp: jsonpatch.Operation = {
                  op: 'add',
                  path: op.path,
                  value: null
                };
                const nullOpError = jsonpatch.validate([nullOp], patchResYamlJson);
                if (!nullOpError) {
                  jsonpatch.applyPatch(patchResYamlJson, [nullOp], true);
                }
              }
            } else if (
              op.op === 'replace' &&
              op.path === '/spec/config/annotations' &&
              oldFormJson.kind === YamlKindEnum.Devbox
            ) {
              // When removing GPU, annotations might become empty object
              // Check if GPU annotation was removed
              const oldAnnotations = (oldFormJson as any)?.spec?.config?.annotations;
              const newAnnotations = (op as any).value;
              if (
                oldAnnotations &&
                oldAnnotations[gpuTypeAnnotationKey] &&
                (!newAnnotations || !newAnnotations[gpuTypeAnnotationKey])
              ) {
                // GPU annotation was removed, set it to null explicitly
                if (!(patchResYamlJson as any).spec.config.annotations) {
                  (patchResYamlJson as any).spec.config.annotations = {};
                }
                (patchResYamlJson as any).spec.config.annotations[gpuTypeAnnotationKey] = null;
              }
            }
          });

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
    env?: {
      name: string;
      value?: string;
      valueFrom?: {
        secretKeyRef: {
          name: string;
          key: string;
        };
      };
    }[];
    volumes?: {
      name: string;
      configMap?: {
        name: string;
      };
      persistentVolumeClaim?: {
        claimName: string;
      };
    }[];
    volumeMounts?: {
      name: string;
      mountPath: string;
    }[];
  };
};
