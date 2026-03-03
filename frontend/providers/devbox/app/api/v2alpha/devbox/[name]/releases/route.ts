import { NextRequest, NextResponse } from 'next/server';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import { sendError, sendValidationError, ErrorType, ErrorCode } from '@/app/api/v2alpha/api-error';
import { json2DevboxRelease } from '@/utils/json2Yaml';
import { adaptDevboxVersionListItem } from '@/utils/adapt';
import { RequestSchema } from './schema';
import { devboxKey, DevboxReleaseStatusEnum } from '@/constants/devbox';
import { generateDevboxRbacAndJob } from '@/utils/rbacJobGenerator';

export const dynamic = 'force-dynamic';

const DEVBOX_NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const MAX_DEVBOX_NAME_LENGTH = 63;
const PATCH_OPTIONS = { headers: { 'Content-Type': 'application/merge-patch+json' } };
const DEVBOX_API = {
  group: 'devbox.sealos.io',
  version: 'v1alpha2',
  devboxes: 'devboxes',
  releases: 'devboxreleases'
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const validateDevboxName = (name: string) =>
  DEVBOX_NAME_PATTERN.test(name) && name.length <= MAX_DEVBOX_NAME_LENGTH;

const is404Error = (err: any) => err?.response?.statusCode === 404 || err?.statusCode === 404;

async function checkResourceExists(checkFn: () => Promise<any>): Promise<boolean> {
  try {
    await checkFn();
    return true;
  } catch (err) {
    if (is404Error(err)) return false;
    throw err;
  }
}

async function waitForResourceDeletion(
  checkFn: () => Promise<any>,
  maxRetries = 30,
  intervalMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkFn();
      await sleep(intervalMs);
    } catch (err) {
      if (is404Error(err)) return true;
      throw err;
    }
  }
  return false;
}

async function listIngresses(k8sNetworkingApp: any, namespace: string, devboxName: string) {
  const { body } = await k8sNetworkingApp.listNamespacedIngress(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${devboxKey}=${devboxName}`
  );
  return body.items || [];
}

async function listDevboxReleases(k8sCustomObjects: any, namespace: string) {
  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    DEVBOX_API.group,
    DEVBOX_API.version,
    namespace,
    DEVBOX_API.releases
  )) as { body: { items: KBDevboxReleaseType[] } };
  return body.items || [];
}

async function listDevboxes(k8sCustomObjects: any, namespace: string) {
  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    DEVBOX_API.group,
    DEVBOX_API.version,
    namespace,
    DEVBOX_API.devboxes
  )) as { body: { items: KBDevboxTypeV2[] } };
  return body.items || [];
}

async function patchIngresses(
  k8sNetworkingApp: any,
  namespace: string,
  ingresses: any[],
  fromClass: string,
  toClass: string
) {
  const patchTasks = ingresses.map((ingress) => {
    const { name, annotations } = ingress.metadata;
    const ann = annotations?.['kubernetes.io/ingress.class'];
    const spec = ingress.spec?.ingressClassName;

    if (ann === fromClass) {
      return k8sNetworkingApp.patchNamespacedIngress(
        name,
        namespace,
        { metadata: { annotations: { 'kubernetes.io/ingress.class': toClass } } },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        PATCH_OPTIONS
      );
    }
    if (spec === fromClass) {
      return k8sNetworkingApp.patchNamespacedIngress(
        name,
        namespace,
        { spec: { ingressClassName: toClass } },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        PATCH_OPTIONS
      );
    }
    return null;
  });

  await Promise.all(patchTasks.filter(Boolean));
}

async function setDevboxState(
  k8sNetworkingApp: any,
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  running: boolean
) {
  const ingresses = await listIngresses(k8sNetworkingApp, namespace, devboxName);
  const [fromClass, toClass] = running ? ['pause', 'nginx'] : ['nginx', 'pause'];

  const targetIngresses = running
    ? ingresses
    : ingresses.filter((ing: any) => {
        const ann = ing.metadata?.annotations?.['kubernetes.io/ingress.class'];
        const spec = ing.spec?.ingressClassName;
        return ann === 'nginx' || spec === 'nginx';
      });

  await patchIngresses(k8sNetworkingApp, namespace, targetIngresses, fromClass, toClass);
  await k8sCustomObjects.patchNamespacedCustomObject(
    DEVBOX_API.group,
    DEVBOX_API.version,
    namespace,
    DEVBOX_API.devboxes,
    devboxName,
    { spec: { state: running ? 'Running' : 'Stopped' } },
    undefined,
    undefined,
    undefined,
    PATCH_OPTIONS
  );
}

interface AutostartJobParams {
  applyYamlList: any;
  delYamlList: any;
  k8sCore: any;
  k8sAuth: any;
  k8sBatch: any;
  namespace: string;
  devboxName: string;
  devboxUid: string;
  execCommand?: string;
}

async function ensureAutostartJob(params: AutostartJobParams) {
  const {
    applyYamlList,
    delYamlList,
    k8sCore,
    k8sAuth,
    k8sBatch,
    namespace,
    devboxName,
    devboxUid,
    execCommand
  } = params;

  const [serviceAccountYaml, roleYaml, roleBindingYaml, jobYaml] = generateDevboxRbacAndJob({
    devboxName,
    devboxNamespace: namespace,
    devboxUID: devboxUid,
    execCommand
  });

  const executorName = `${devboxName}-executor`;
  const jobName = `${devboxName}-exec-job`;
  const yamlsToApply: string[] = [];

  const [saExists, roleExists, rbExists] = await Promise.all([
    checkResourceExists(() => k8sCore.readNamespacedServiceAccount(executorName, namespace)),
    checkResourceExists(() => k8sAuth.readNamespacedRole(`${executorName}-role`, namespace)),
    checkResourceExists(() =>
      k8sAuth.readNamespacedRoleBinding(`${executorName}-binding`, namespace)
    )
  ]);

  if (!saExists) yamlsToApply.push(serviceAccountYaml);
  if (!roleExists) yamlsToApply.push(roleYaml);
  if (!rbExists) yamlsToApply.push(roleBindingYaml);

  // Recreate Job
  const jobExists = await checkResourceExists(() => k8sBatch.readNamespacedJob(jobName, namespace));
  if (jobExists) {
    await delYamlList([jobYaml]);
    const deleted = await waitForResourceDeletion(() =>
      k8sBatch.readNamespacedJob(jobName, namespace)
    );
    if (!deleted) throw new Error('Timeout waiting for previous autostart Job to be deleted');
  }

  yamlsToApply.push(jobYaml);
  await applyYamlList(yamlsToApply, 'create');
}

interface ReleaseTaskParams extends AutostartJobParams {
  k8sCustomObjects: any;
  k8sNetworkingApp: any;
  tag: string;
  releaseDescription: string;
  wasRunning: boolean;
  shouldRestart: boolean;
}

async function executeReleaseTask(params: ReleaseTaskParams) {
  const {
    applyYamlList,
    delYamlList,
    k8sCustomObjects,
    k8sNetworkingApp,
    k8sCore,
    k8sAuth,
    k8sBatch,
    namespace,
    devboxName,
    devboxUid,
    tag,
    releaseDescription,
    wasRunning,
    shouldRestart,
    execCommand
  } = params;

  await setDevboxState(k8sNetworkingApp, k8sCustomObjects, namespace, devboxName, false);

  try {
    const devboxYaml = json2DevboxRelease({
      devboxName,
      tag,
      releaseDes: releaseDescription,
      devboxUid,
      startDevboxAfterRelease: false
    });
    await applyYamlList([devboxYaml], 'create');

    // Poll release status
    for (let retry = 0; retry < 200; retry++) {
      const releases = await listDevboxReleases(k8sCustomObjects, namespace);
      const release = releases.find((item) => {
        if (item?.spec?.devboxName !== devboxName || item?.spec?.version !== tag) return false;
        const ownerUid = item?.metadata?.ownerReferences?.[0]?.uid;
        return !devboxUid || !ownerUid || ownerUid === devboxUid;
      });

      if (release?.status?.phase === DevboxReleaseStatusEnum.Success) {
        if (shouldRestart) {
          await setDevboxState(k8sNetworkingApp, k8sCustomObjects, namespace, devboxName, true);
          await ensureAutostartJob({
            applyYamlList,
            delYamlList,
            k8sCore,
            k8sAuth,
            k8sBatch,
            namespace,
            devboxName,
            devboxUid,
            execCommand
          });
        }
        return;
      }
      if (release?.status?.phase === DevboxReleaseStatusEnum.Failed) {
        throw new Error('Devbox release failed');
      }
      await sleep(3000);
    }
    throw new Error('Devbox release timeout');
  } catch (e) {
    if (wasRunning) {
      try {
        await setDevboxState(k8sNetworkingApp, k8sCustomObjects, namespace, devboxName, true);
      } catch {}
    }
    console.error('[ReleaseTask Error]', devboxName, tag, e);
  }
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;
    if (!validateDevboxName(devboxName)) {
      return sendError({
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Invalid devbox name format'
      });
    }

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const devboxes = await listDevboxes(k8sCustomObjects, namespace);
    if (!devboxes.some((item) => item?.metadata?.name === devboxName)) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Devbox not found'
      });
    }

    const releases = await listDevboxReleases(k8sCustomObjects, namespace);
    const { REGISTRY_ADDR } = process.env;

    const versions = releases
      .filter((item) => item.spec?.devboxName === devboxName)
      .map(adaptDevboxVersionListItem)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .map(({ createTime, ...rest }) => ({
        ...rest,
        createdAt: createTime,
        image: `${REGISTRY_ADDR}/${namespace}/${rest.devboxName}:${rest.tag}`
      }));

    return NextResponse.json(versions);
  } catch (err: any) {
    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: err?.message || 'Internal server error'
    });
  }
}

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      return sendValidationError(validationResult.error, 'Invalid request body');
    }

    const { name: devboxName } = params;
    if (!validateDevboxName(devboxName)) {
      return sendError({
        status: 400,
        type: ErrorType.VALIDATION_ERROR,
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Invalid devbox name format'
      });
    }

    const { tag, releaseDescription, execCommand, startDevboxAfterRelease } = validationResult.data;

    const {
      applyYamlList,
      delYamlList,
      namespace,
      k8sCustomObjects,
      k8sNetworkingApp,
      k8sCore,
      k8sAuth,
      k8sBatch
    } = await getK8s({ kubeconfig: await authSession(req.headers) });

    const [releases, devboxes] = await Promise.all([
      listDevboxReleases(k8sCustomObjects, namespace),
      listDevboxes(k8sCustomObjects, namespace)
    ]);

    const devbox = devboxes.find((item) => item.metadata?.name === devboxName);
    if (!devbox) {
      return sendError({
        status: 404,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.NOT_FOUND,
        message: 'Devbox not found'
      });
    }

    const tagExists = releases.some(
      (item) => item.spec?.devboxName === devboxName && item.spec?.version === tag
    );
    if (tagExists) {
      return sendError({
        status: 409,
        type: ErrorType.RESOURCE_ERROR,
        code: ErrorCode.ALREADY_EXISTS,
        message: 'Devbox release already exists'
      });
    }

    executeReleaseTask({
      applyYamlList,
      delYamlList,
      k8sCustomObjects,
      k8sNetworkingApp,
      k8sCore,
      k8sAuth,
      k8sBatch,
      namespace,
      devboxName,
      devboxUid: devbox?.metadata?.uid || '',
      tag,
      releaseDescription,
      wasRunning: devbox?.spec?.state === 'Running',
      shouldRestart: startDevboxAfterRelease,
      execCommand
    }).catch((err) => console.error('[ReleaseTask Unhandled]', err));

    return NextResponse.json({ name: devboxName, status: 'creating' }, { status: 202 });
  } catch (err: any) {
    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: err?.message || 'Internal server error'
    });
  }
}
