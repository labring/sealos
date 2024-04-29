import * as k8s from '@kubernetes/client-node';
import { k8sFormatTime } from '@/utils/format';
import { StatusCR, UserCR } from '@/types';
import { KubeConfig } from '@kubernetes/client-node';

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
  timeout = 15000
}: {
  kc: k8s.KubeConfig;
  group: string;
  version: string;
  plural: string;
  name: string;
  interval?: number;
  timeout?: number;
}) {
  let lastbody;
  const startTime = Date.now();
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    let body = null;
    try {
      const data = await client.getClusterCustomObjectStatus(group, version, plural, name);
      body = data.body;
      if (
        'status' in body &&
        // @ts-ignore
        'kubeConfig' in body.status &&
        JSON.stringify(body) !== JSON.stringify(lastbody)
      ) {
        lastbody = body;
        // @ts-ignore
        return body.status.kubeConfig as string;
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

async function watchCustomClusterObject({
  kc,
  group,
  version,
  plural,
  name,
  fn = (pre, cur) => JSON.stringify(pre) !== JSON.stringify(cur),
  interval = 1000,
  timeout = 15000
}: {
  kc: k8s.KubeConfig;
  group: string;
  version: string;
  plural: string;
  name: string;
  fn?: (pre: any, cur: any) => boolean;
  interval?: number;
  timeout?: number;
}) {
  let lastbody;
  const startTime = Date.now();
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    let body = null;
    try {
      const data = await client.getClusterCustomObjectStatus(group, version, plural, name);
      body = data.body;
      if (fn(lastbody as any, body as any)) {
        lastbody = body;
        return body;
      }
    } catch (err) {
      console.error(`Failed to get status for ${name}: ${err}`);
    }
    if (Date.now() - startTime >= timeout) {
      console.error(`Timed out after ${timeout} ms.`);
      break;
    }
  }
  return null;
}

async function setUserKubeconfig(kc: k8s.KubeConfig, uid: string, k8s_username: string) {
  const resourceKind = 'User';
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const updateTime = k8sFormatTime(new Date());
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const body = await client
    .getClusterCustomObject(group, version, plural, k8s_username)
    .then((res) => res.body as UserCR)
    .catch((res) => {
      const body = res.body as StatusCR;
      if (
        body &&
        body.kind === 'Status' &&
        res.body.reason === 'NotFound' &&
        res.body.code === 404
      ) {
        return Promise.resolve(body);
      } else {
        console.error(res);
        return Promise.reject(res);
      }
    });
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
      }
    };
    await client.createClusterCustomObject(group, version, plural, resourceObj);
  } else {
    body.metadata.labels = {
      uid,
      updateTime
    };
    const patchs = [{ op: 'replace', path: '/metadata/labels/updateTime', value: updateTime }];
    await client.patchClusterCustomObject(
      group,
      version,
      plural,
      k8s_username,
      patchs,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      }
    );
  }
  return k8s_username;
}

async function setUserTeamCreate(kc: k8s.KubeConfig, k8s_username: string, owner: string) {
  const group = 'user.sealos.io';
  const resourceKind = 'User';
  const version = 'v1';
  const plural = 'users';
  const updateTime = k8sFormatTime(new Date());
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const resourceObj = {
    apiVersion: 'user.sealos.io/v1',
    kind: resourceKind,
    metadata: {
      annotations: {
        'user.sealos.io/owner': owner
      },
      name: k8s_username,
      labels: {
        'user.sealos.io/type': 'Group',
        owner: updateTime
      }
    }
  };
  await client.createClusterCustomObject(group, version, plural, resourceObj);
  return k8s_username;
}

async function removeUserTeam(kc: k8s.KubeConfig, k8s_username: string) {
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const updateTime = k8sFormatTime(new Date());
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const patchs = [
    { op: 'add', path: '/metadata/labels/user.sealos.io~1status', value: 'Deleted' },
    { op: 'replace', path: '/metadata/labels/updateTime', value: updateTime }
  ];
  await client.patchClusterCustomObject(
    group,
    version,
    plural,
    k8s_username,
    patchs,
    undefined,
    undefined,
    undefined,
    {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    }
  );
  return k8s_username;
}
async function removeUser(kc: k8s.KubeConfig, k8s_username: string) {
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const updateTime = k8sFormatTime(new Date());
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  const patchs = [
    { op: 'add', path: '/metadata/labels/user.sealos.io~1status', value: 'Deleted' },
    { op: 'replace', path: '/metadata/labels/updateTime', value: updateTime }
  ];
  await client.patchClusterCustomObject(
    group,
    version,
    plural,
    k8s_username,
    patchs,
    undefined,
    undefined,
    undefined,
    {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    }
  );
  return k8s_username;
}
export const getUserCr = async (kc: KubeConfig, name: string) => {
  const resourceKind = 'User';
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  const client = kc.makeApiClient(k8s.CustomObjectsApi);
  return await client
    .getClusterCustomObject(group, version, plural, name)
    .then((res) => res.body as UserCR);
};
// for enter user state
export const getUserKubeconfigNotPatch = async (name: string) => {
  const kc = K8sApiDefault();
  try {
    const userCr = await getUserCr(kc, name);
    if (userCr?.status?.kubeConfig) return userCr.status.kubeConfig;
    else return null;
  } catch (e) {
    return null;
  }
};
// for update sign in
export const getUserKubeconfig = async (uid: string, k8s_username: string) => {
  const kc = K8sApiDefault();
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  await setUserKubeconfig(kc, uid, k8s_username);

  let kubeconfig = await watchClusterObject({
    kc,
    group,
    version,
    plural,
    name: k8s_username
  });
  return kubeconfig;
};
// for create workspace
export const getTeamKubeconfig = async (k8s_username: string, owner: string) => {
  const kc = K8sApiDefault();
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  await setUserTeamCreate(kc, k8s_username, owner);

  let body = await watchCustomClusterObject({
    kc,
    group,
    version,
    plural,
    fn(_, cur) {
      return (
        cur?.metadata?.labels?.['user.sealos.io/type'] === 'Group' &&
        cur?.metadata?.annotations?.['user.sealos.io/owner'] === owner
      );
    },
    name: k8s_username
  });
  return body;
};

export const setUserTeamDelete = async (k8s_username: string) => {
  const kc = K8sApiDefault();
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';

  await removeUserTeam(kc, k8s_username);

  let body = await watchCustomClusterObject({
    kc,
    group,
    version,
    plural,
    fn(_, cur) {
      return cur?.metadata?.labels?.['user.sealos.io/status'] === 'Deleted';
    },
    name: k8s_username
  });
  return body;
};
export const setUserDelete = async (k8s_username: string) => {
  const kc = K8sApiDefault();
  const group = 'user.sealos.io';
  const version = 'v1';
  const plural = 'users';
  try {
    const userCr = await getUserCr(kc, k8s_username);
    // @ts-ignore
    if (userCr.metadata?.labels?.['user.sealos.io/status'] === 'Deleted') return true;
  } catch (e) {
    return true;
  }
  await removeUser(kc, k8s_username);

  const body = await watchCustomClusterObject({
    kc,
    group,
    version,
    plural,
    fn(_, cur) {
      return cur?.metadata?.labels?.['user.sealos.io/status'] === 'Deleted';
    },
    name: k8s_username,
    interval: 100
  });
  return !!body;
};
