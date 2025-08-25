import { AdminerStatus, generateAdminerTemplate } from '@/interfaces/adminer';
import { generateKubeBlockClusters } from '@/interfaces/kubeblock';
import { authSession } from '@/service/auth';
import {
  CRDMeta,
  CreateOrReplaceYaml,
  GetCRD,
  GetUserDefaultNameSpace,
  K8sApi
} from '@/service/kubernetes';
import { jsonRes } from '@/service/response';
import { HttpError } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

const AdminerMeta: CRDMeta = {
  group: 'adminer.db.sealos.io',
  version: 'v1',
  namespace: '',
  plural: 'adminers'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const kubeconfig = await authSession(req.headers);
    const kc = K8sApi(kubeconfig);

    const kube_user = kc.getCurrentUser();
    if (
      !kube_user ||
      !kube_user.name ||
      (!kube_user.token && !kube_user.certData && !kube_user.keyData)
    ) {
      throw new Error('kube_user get failed');
    }

    const adminerName = 'adminer-' + kube_user.name;
    const namespace = kc.contexts[0]?.namespace || GetUserDefaultNameSpace(kube_user.name);

    let connections: string[] = [];
    try {
      // get kubeblock clusters
      connections = await generateKubeBlockClusters(kc, namespace);
    } catch (error) {
      // console.log(error);
    }

    try {
      // always apply cr, for new db cluster may be added
      const adminerYaml = generateAdminerTemplate({
        namespace: namespace,
        adminerName: adminerName,
        currentTime: new Date().toISOString(),
        connections: connections
      });
      await CreateOrReplaceYaml(kc, [adminerYaml]);
    } catch (error) {
      const errHttp = error as HttpError;
      if (!errHttp || errHttp.response.statusCode !== 409) {
        throw error;
      }
    }

    // continue to get user namespace crd
    let adminerMetaUser = { ...AdminerMeta };
    adminerMetaUser.namespace = namespace;

    try {
      // get crd
      const adminerUserDesc = await GetCRD(kc, adminerMetaUser, adminerName);

      if (adminerUserDesc?.body?.status) {
        const adminerStatus = adminerUserDesc.body.status as AdminerStatus;
        if (adminerStatus.availableReplicas > 0) {
          // temporarily add domain scheme
          return jsonRes(res, { data: adminerStatus.domain || '' });
        }
      }
    } catch (error) {
      // console.log(error)
    }

    jsonRes(res, { code: 201, data: null, message: '' });
  } catch (error) {
    // console.log(error)
    jsonRes(res, { code: 500, error });
  }
}
