import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { getTemplateEnvs } from '@/utils/tools';
import { proxyTemplateIconUrls } from '@/utils/templateAsset';
import { TemplateInstanceType } from '@/types/app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const InstanceCRD: CRDMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: namespace,
      plural: 'instances'
    };

    const result = await k8sCustomObjects.listNamespacedCustomObject(
      InstanceCRD.group,
      InstanceCRD.version,
      InstanceCRD.namespace,
      InstanceCRD.plural
    );

    const templateEnvs = getTemplateEnvs();
    const templateRepo = {
      url: templateEnvs.TEMPLATE_REPO_URL,
      branch: templateEnvs.TEMPLATE_REPO_BRANCH,
      provider: templateEnvs.TEMPLATE_REPO_PROVIDER
    };
    const body = result.body as { items: TemplateInstanceType[]; [key: string]: unknown };

    jsonRes(res, {
      data: {
        ...body,
        items: (body.items || []).map((item) => proxyTemplateIconUrls(item, templateRepo))
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
