import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { ApiSession, Session } from '@/types/session';
import { passwrodUserIsExist, signUpByPassword } from '@/services/backend/oauth';
import { enablePassword, enableApi, enableSignUp } from '@/services/enable';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { strongPassword } from '@/utils/crypto';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!enablePassword()) {
      throw new Error('PASSWORD_SALT is not defined');
    }
    if (!enableSignUp()) throw new Error('Failed to sign up user');
    if (!enableApi()) throw new Error('Failed to sign up by api');
    const { password, username } = req.body as Record<string, string>;
    if (!password) return jsonRes(res, { code: 400, message: 'password is Required' });
    if (!username) return jsonRes(res, { code: 400, message: 'username is Required' });
    // const userAndPassword = await getUserAndPassword();
    // if (!userAndPassword) throw Error('Failed to generate user ');
    // const { username, password } = userAndPassword;
    if (!strongPassword(password)) {
      return jsonRes(res, {
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
        code: 400
      });
    }
    const isExist = await passwrodUserIsExist({ username });
    if (isExist)
      return jsonRes(res, {
        message: 'User is already exist',
        code: 409
      });
    const signResult = await signUpByPassword({
      username,
      password
    });
    if (!signResult) throw new Error('Failed to edit db');
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
