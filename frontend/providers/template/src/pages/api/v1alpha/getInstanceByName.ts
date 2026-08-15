import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

import { TemplateInstanceType } from '@/types/app';
import { adaptInstanceListItem } from '@/utils/adapt';
import { getTemplateEnvs } from '@/utils/tools';
import { proxyTemplateIconUrls } from '@/utils/templateAsset';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const InstanceCRD: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'instances'
    };

    const result = await k8sCustomObjects
      .getNamespacedCustomObject(
        InstanceCRD.group,
        InstanceCRD.version,
        InstanceCRD.namespace,
        InstanceCRD.plural,
        instanceName
      )
      .then((r) => {
        const templateEnvs = getTemplateEnvs();
        const templateRepo = {
          url: templateEnvs.TEMPLATE_REPO_URL,
          branch: templateEnvs.TEMPLATE_REPO_BRANCH,
          provider: templateEnvs.TEMPLATE_REPO_PROVIDER
        };
        return adaptInstanceListItem(
          proxyTemplateIconUrls(r.body as TemplateInstanceType, templateRepo)
        );
      });

    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
