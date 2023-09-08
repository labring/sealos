import { authSession, generateJWT } from '@/services/backend/auth';
import { queryUsersByNamespace } from '@/services/backend/db/userToNamespace';
import { switchNamespace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import * as jsYaml from 'js-yaml';
import { Session } from '@/types';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid } = req.body;
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'ns_uid is required' });
    const nsUsers = await queryUsersByNamespace({ namespaceId: ns_uid });
    const userInNs = nsUsers.find(
      (item) => item.userId === payload.user.uid && payload.user.k8s_username === item.k8s_username
    ); // if (
    if (!userInNs) return jsonRes(res, { code: 403, message: 'you are not in this namespace' });
    const kubeconfig = jsYaml.dump(
      JSON.parse(switchNamespace(payload.kc, userInNs?.namespace?.id || '').exportConfig())
    );
    const user = {
      ns_uid: userInNs.namespaceId,
      nsid: userInNs.namespace.id,
      userId: payload.user.uid,
      k8s_username: payload.user.k8s_username,
      name: userInNs.user.name,
      avatar: userInNs.user.avatar_url
    };

    const token = generateJWT({
      kubeconfig,
      user: {
        uid: user.userId,
        k8s_username: user.k8s_username,
        ns_uid: user.ns_uid,
        nsid: user.nsid
      }
    });
    const data: Session = {
      token,
      user,
      kubeconfig
    };
    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    jsonRes(res, { code: 500, message: 'fail to switch namespace' });
  }
}
