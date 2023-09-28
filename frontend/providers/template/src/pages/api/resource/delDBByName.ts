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
    const { name } = req.query as { name: string };
    if (!name) {
      throw new Error('deploy name is empty');
    }

    const { namespace, k8sCustomObjects, k8sAuth, k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // get backup and delete
    const backups = await getBackups({ dbName: name, req });
    await Promise.all(
      backups.map((item) => delBackupByName({ backupName: item.metadata.name, req }))
    );

    // del role
    await Promise.all([
      k8sAuth.deleteNamespacedRole(name, namespace),
      k8sAuth.deleteNamespacedRoleBinding(name, namespace),
      k8sCore.deleteNamespacedServiceAccount(name, namespace)
    ]);

    // delete cluster
    await k8sCustomObjects.deleteNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      name
    );
    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
