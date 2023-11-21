import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { ApiSession, Session } from '@/types/session';
import { signInByPassword } from '@/services/backend/oauth';
import { enableApi, enablePassword } from '@/services/enable';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    if (!enableApi()) throw new Error('Failed to sign in by api');
    const { password, username } = req.body as Record<string, string>;
    if (!password) return jsonRes(res, { code: 400, message: 'password is Required' });
    if (!username) return jsonRes(res, { code: 400, message: 'username is Required' });
    const signResult = await signInByPassword({
      username,
      password
    });
    if (!signResult)
      return jsonRes(res, {
        code: 403,
        message: 'user is invaild'
      });
    const { k8s_user, namespace, user } = signResult;
    const kubernetesUsername = k8s_user.name;
    const kubeconfig = await getUserKubeconfig(user.uid, kubernetesUsername);
    if (!kubeconfig) {
      throw new Error('Failed to get user config');
    }
    return jsonRes<ApiSession>(res, {
      data: {
        user: {
          name: user.name,
          kubernetesUsername,
          avatar: user.avatar_url,
          nsID: namespace.id,
          nsUID: namespace.uid,
          userID: user.uid
        },
        kubeconfig
      },
      code: 200,
      message: 'Successfully'
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to authenticate with password',
      code: 500
    });
  }
}
