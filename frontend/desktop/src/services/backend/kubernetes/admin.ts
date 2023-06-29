import * as k8s from '@kubernetes/client-node';
import { customAlphabet } from 'nanoid'
import { k8sFormatTime } from '@/utils/format';
import { StatusCR, UserCR } from '@/types';
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
  interval = 1000,
  timeout = 15000,
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
    let body = null
    try {
      const data = await client.getClusterCustomObjectStatus(
        group,
        version,
        plural,
        name,
      );
      body = data.body;
      // @ts-ignore
      if ("status" in body && "kubeConfig" in body.status && JSON.stringify(body) !== JSON.stringify(lastbody)) {

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
async function setUserKubeconfig(kc: k8s.KubeConfig, uid: string, k8s_username: string) {
  const resourceKind = 'User';
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const updateTime = k8sFormatTime(new Date())
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const body = (await client.getClusterCustomObject(
    group,
    version,
    plural,
    k8s_username
  )
    .then(res => res.body as UserCR)
    .catch(res => {
      const body = res.body as StatusCR
      if (body.kind === 'Status' && res.body.reason === 'NotFound' && res.body.code === 404) {
        return Promise.resolve(body)
      } else {
        return Promise.reject(res)
      }
    }))
  if (body.kind !== resourceKind) {
    const resourceObj = {
      apiVersion: 'user.sealos.io/v1',
      kind: resourceKind,
      metadata: {
        name: k8s_username,
        labels: {
          uid,
          updateTime
        }
      },
    };
    await client.createClusterCustomObject(group, version, plural, resourceObj);
  } else {
    body.metadata.labels = {
      uid,
      updateTime
    };
    // name = existingResource.metadata.name
    const patchs = [
      { op: 'replace', path: '/metadata/labels/updateTime', value: updateTime },
    ]
    await client.patchClusterCustomObject(group, version, plural, k8s_username, patchs, undefined, undefined, undefined, {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    });
  }
  return k8s_username
}
// 系统迁移
async function setUserKubeconfigByuid(kc: k8s.KubeConfig, uid: string) {
  const resourceType = 'User';
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const labelSelector = `uid=${uid}`;
  let name: string = ''
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const { response } = (await client.listClusterCustomObject(group, version, plural, undefined, undefined, undefined, undefined, labelSelector)) as unknown as { response: { body: { items: any[] } } };
  if (response.body.items.length === 0) {
    console.log(`Created new ${resourceType} with labels ${JSON.stringify(labelSelector)}`);
  } else {
    // 找name
    const existingResource = response.body.items[response.body.items.length - 1];
    name = existingResource.metadata.name
  }
  return name
}
export const getUserKubeconfigByuid = async (uid: string) => {
  const kc = K8sApiDefault()
  return await setUserKubeconfigByuid(kc, uid)
}
export const getUserKubeconfig = async (uid: string, k8s_username: string) => {
  const kc = K8sApiDefault()
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  await setUserKubeconfig(kc, uid, k8s_username)

  let kubeconfig = await watchClusterObject({
    kc,
    group,
    version,
    plural,
    name: k8s_username,
  });
  return kubeconfig
}