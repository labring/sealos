import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export async function getBackups({ dbName, req }: { dbName: string; req: NextApiRequest }) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';

  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    undefined,
    undefined,
    undefined,
    undefined,
    `app.kubernetes.io/instance=${dbName}`
  )) as { body: { items: any[] } };

  return body?.items || [];
}

export async function delBackupByName({
  backupName,
  req
}: {
  backupName: string;
  req: NextApiRequest;
}) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';

  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });
  await k8sCustomObjects.deleteNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    backupName
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    if (!instanceName) {
      throw new Error('deploy name is empty');
    }

    const { namespace, k8sCustomObjects, k8sAuth, k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // get backup and delete
    const backups = await getBackups({ dbName: instanceName, req });
    await Promise.all(
      backups.map((item) => delBackupByName({ backupName: item.metadata.name, req }))
    );

    // del service
    await k8sCore.deleteNamespacedService(`${instanceName}-export`, namespace).catch((err) => {
      if (err?.body?.code !== 404) {
        throw new Error(err?.message || 'Delete DB Service Export Error');
      }
    });

    // del role
    await Promise.all([
      k8sAuth.deleteNamespacedRole(instanceName, namespace),
      k8sAuth.deleteNamespacedRoleBinding(instanceName, namespace),
      k8sCore.deleteNamespacedServiceAccount(instanceName, namespace)
    ]);

    // delete cluster
    await k8sCustomObjects.deleteNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      instanceName
    );
    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
