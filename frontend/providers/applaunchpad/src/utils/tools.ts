import dayjs from 'dayjs';
import { useToast } from '@/hooks/useToast';
import { AppEditType } from '@/types/app';
import { defaultEditVal } from '@/constants/editApp';
import yaml from 'js-yaml';
import { DeployKindsType } from '@/types/app';
import type { AppDetailType, AppPatchPropsType } from '@/types/app';
import { YamlKindEnum } from './adapt';
import { useTranslation } from 'next-i18next';
import * as jsonpatch from 'fast-json-patch';
import { Base64 } from 'js-base64';

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

  const copyData = async (data: string, title: string = 'Copy Success') => {
    console.log('Attempting to copy:', data);

    // Modern browsers (Chrome, Edge, Safari, Firefox) support the Clipboard API.
    // This is the preferred method. It only works in secure contexts (HTTPS or localhost).
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(data);
        toast({
          title: t(title),
          status: 'success',
          duration: 1000
        });
        return; // Exit the function after successful copy
      } catch (err) {
        console.error('Clipboard API failed, falling back...', err);
        // The error will be caught, and we'll proceed to the fallback method.
      }
    }

    // Fallback for older browsers or if the Clipboard API fails (e.g., due to permissions).
    try {
      const textarea = document.createElement('textarea');
      textarea.value = data;
      // Make the textarea invisible
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';

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
      // If both methods fail, show an error.
      console.error('Fallback copy method failed', error);
      toast({
        title: t('Copy Failed'),
        status: 'error'
      });
    }
  };

  return { copyData };
};

/**
 * format string to number or ''
 */
export const str2Num = (str?: string | number) => {
  return !!str ? +str : '';
};

export const mountPathToConfigMapKey = (str: string) => {
  const endsWithSlash = str.endsWith('/');
  const withoutTrailingSlash = endsWithSlash ? str.slice(0, -1) : str;
  const replacedStr = withoutTrailingSlash.replace(/_/g, '-').replace(/[\/.]/g, 'vn-');
  const result = replacedStr.toLowerCase();

  if (result.length > 63) {
    return result.slice(-63);
  }

  return result;
};

/**
 * str to base64
 */
export const strToBase64 = (str: string) => {
  try {
    const base64 = Base64.encode(str);
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
    const secretData = JSON.parse(Base64.decode(secret)).auths;
    console.log('secretData', secretData);
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
    const oldFormJson =
      newYamlJson.kind === 'ConfigMap'
        ? originalYamlList.find(
            (item) =>
              item.kind === newYamlJson.kind && item?.metadata?.name === newYamlJson?.metadata?.name
          )
        : oldFormJsonList.find(
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

          // console.log('[DEBUG JSON COMPARE]', {
          //   kind: oldFormJson.kind,
          //   name: oldFormJson.metadata?.name,
          //   oldFormJson,
          //   crOldYamlJson,
          //   newYamlJson
          // });

          /* Fill in volume - Handle Deployment/StatefulSet */
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
          // Check if there are ports-related operations and data inconsistency
          const hasPortsOperations = patchRes.some((op) => op.path.includes('/ports/'));
          let shouldReplacePortsArray = false;
          let portsReplacePath = '';
          let portsReplaceValue: any = null;

          if (hasPortsOperations) {
            // Check ports array consistency for Deployment/StatefulSet
            if (
              oldFormJson.kind === YamlKindEnum.Deployment ||
              oldFormJson.kind === YamlKindEnum.StatefulSet
            ) {
              const oldFormPorts =
                (oldFormJson as any)?.spec?.template?.spec?.containers?.[0]?.ports || [];
              const crOldPorts =
                (crOldYamlJson as any)?.spec?.template?.spec?.containers?.[0]?.ports || [];
              const newFormPorts =
                (newYamlJson as any)?.spec?.template?.spec?.containers?.[0]?.ports || [];

              if (oldFormPorts.length !== crOldPorts.length) {
                shouldReplacePortsArray = true;
                portsReplacePath = '/spec/template/spec/containers/0/ports';
                portsReplaceValue = newFormPorts;
              }
            }
            // Check ports array consistency for Service
            else if (oldFormJson.kind === YamlKindEnum.Service) {
              const oldFormPorts = (oldFormJson as any)?.spec?.ports || [];
              const crOldPorts = (crOldYamlJson as any)?.spec?.ports || [];
              const newFormPorts = (newYamlJson as any)?.spec?.ports || [];

              if (oldFormPorts.length !== crOldPorts.length) {
                shouldReplacePortsArray = true;
                portsReplacePath = '/spec/ports';
                portsReplaceValue = newFormPorts;
              }
            }
          }

          const _patchRes: jsonpatch.Operation[] = patchRes
            .map((item) => {
              // If we need to replace ports array, filter out all ports-related operations
              if (shouldReplacePortsArray && item.path.includes('/ports/')) {
                return null;
              }

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

          // Add ports array replace operation if needed
          if (shouldReplacePortsArray && portsReplacePath && portsReplaceValue !== null) {
            _patchRes.push({
              op: 'replace',
              path: portsReplacePath,
              value: portsReplaceValue
            });
          }

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

export const generatePvcNameRegex = (appDetail?: AppDetailType): string => {
  if (!appDetail?.storeList?.length || !appDetail?.labels?.app) {
    return '';
  }
  const pvcPrefix = `(${appDetail.storeList.map((item) => item.name).join('|')})`;
  const appName = appDetail.appName;
  const pvcNameRegex = `${pvcPrefix}-${appName}-[0-9]+`;
  return pvcNameRegex;
};
