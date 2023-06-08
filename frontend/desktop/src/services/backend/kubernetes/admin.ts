import * as k8s from '@kubernetes/client-node';
import http from 'http';
import { customAlphabet } from 'nanoid'
import * as yaml from 'js-yaml';
import { k8sFormatTime } from '@/utils/format';
const LetterBytes = "abcdefghijklmnopqrstuvwxyz0123456789"
const HostnameLength = 8
const nanoid = customAlphabet(LetterBytes, HostnameLength)

export function K8sApiDefault(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  return kc;
}

async function watchClusterObject({
  kc,
  group,
  version,
  plural,
  name,
  interval = 500,
  timeout = 5000,
}: {
  kc: k8s.KubeConfig,
  group: string,
  version: string,
  plural: string,
  name: string,
  interval?: number,
  timeout?: number
}
) {
  let lastbody;
  const startTime = Date.now();
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    try {
      const { body } = await client.getClusterCustomObjectStatus(
        group,
        version,
        plural,
        name,
      );
      if (JSON.stringify(body) !== JSON.stringify(lastbody)) {
        // console.log(`Status for ${name} has changed:`);
        lastbody = body;
        // @ts-ignore        
        return body.status.kubeConfig as string
      }
    } catch (err) {
      console.error(`Failed to get status for ${name}: ${err}`);
    }
    if (Date.now() - startTime >= timeout) {
      console.error(`Timed out after ${timeout} ms.`);
      break;
    }

  }
}
async function setUserKubeconfig(kc: k8s.KubeConfig,uid:string) {
  const resourceType = 'User';
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const labelSelector = `uid=${uid}`;
  const updateTime = k8sFormatTime(new Date())
  let name = nanoid()
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const { response } = (await client.listClusterCustomObject(group, version, plural, undefined, undefined, undefined, undefined, labelSelector, 1)) as unknown as { response: { body: { items: any[] } } };
  if (response.body.items.length > 1) {
    throw new Error(`Multiple resources found with labels ${JSON.stringify(labelSelector)}`);
  } else if (response.body.items.length === 0) {
    // 如果没有匹配项，则创建新的资源对象并保存到 Kubernetes 中
    // console.log('create')
    const resourceObj = {
      apiVersion: 'user.sealos.io/v1',
      kind: resourceType,
      metadata: {
        name,
        labels: {
          uid,
          updateTime
        }
      },
    };
    await client.createClusterCustomObject(group, version, plural, resourceObj);
    // console.log(`Created new ${resourceType} with labels ${JSON.stringify(labelSelector)}`);
  } else {
    // 更新匹配的资源对象的标签并保存到 Kubernetes 中
    // console.log('patch')
    const existingResource = response.body.items[0];
    existingResource.metadata.labels = {
      uid,
      updateTime
    };
    name = existingResource.metadata.name
    const patchs = [
      { op: 'replace', path: '/metadata/labels/updateTime', value: updateTime },
    ]
    await client.patchClusterCustomObject(group, version, plural, name, patchs, undefined, undefined, undefined, {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    });
    // console.log(`Updated existing ${resourceType} with labels ${JSON.stringify(labelSelector)}`);
  }
  return name
}



export const getUserKubeconfig = async (uid: string) => {
  const kc = K8sApiDefault()
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  // 创建资源对象
  const resourceType = 'User';
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  // set user kubeconfig
  // console.log('ready set user kubeconfig')
  const name = await setUserKubeconfig(kc, uid)
  // watch user status
  // console.log('watch')
  let kubeconfig = await watchClusterObject({
    kc,
    group,
    version,
    plural,
    name,
  });
  return kubeconfig
}