import { Session } from '@/types';
import { generateJWT } from './auth';
import { addK8sUser, createUser, queryUser, removeUser, updateUser } from './db/user';
import { Provider, User } from '@/types/user';
import { getUserKubeconfig, getUserKubeconfigByuid } from './kubernetes/admin';
import { hashPassword, verifyPassword } from '@/utils/crypto';
import { createNS, queryNS } from './db/namespace';
import { GetUserDefaultNameSpace } from './kubernetes/user';
import { WithId } from 'mongodb';
import { v4 as uuid } from 'uuid';
import { createUTN, queryUTN } from './db/userToNamespace';
import { InvitedStatus, NSType, UserRole } from '@/types/team';
import { enableSignUp } from '../enable';
import RandExp from 'randexp';
import { reject } from 'lodash';

export const getOauthRes = async ({
  provider,
  id,
  name,
  avatar_url,
  password
}: {
  provider: Provider;
  id: string;
  name: string;
  avatar_url: string;
  password?: string;
}): Promise<Session> => {
  if (provider === 'password_user' && !password) {
    throw new Error('password is required');
  }
  const _user = await queryUser({ id, provider });
  let signResult = null;
  if (!_user) {
    if (!enableSignUp()) throw new Error('Failed to find user');
    signResult = await signUp({
      provider,
      id,
      name,
      avatar_url,
      password
    });
  } else {
    signResult = await signIn({
      userResult: _user,
      provider,
      id,
      password
    });
  }
  if (!signResult) throw new Error('Failed to edit db');
  const { k8s_user, namespace, user } = signResult;
  const k8s_username = k8s_user.name;
  // check k8suser.namespace
  if (namespace.nstype !== NSType.Private) return Promise.reject('Failed to get private namespace');
  const kubeconfig = await getUserKubeconfig(user.uid, k8s_username);
  if (!kubeconfig) {
    throw new Error('Failed to get user config');
  }
  const token = generateJWT({
    user: { k8s_username, uid: user.uid, nsid: namespace.id, ns_uid: namespace.uid },
    kubeconfig
  });
  return {
    token,
    user: {
      name: user.name,
      k8s_username,
      avatar: user.avatar_url,
      nsid: namespace.id,
      ns_uid: namespace.uid,
      userId: user.uid
    },
    kubeconfig
  };
};

async function signIn({
  userResult: _user,
  provider,
  id,
  password
}: {
  provider: Provider;
  id: string;
  password?: string;
  userResult: WithId<User>;
}) {
  if (provider === 'password_user') {
    if (!_user.password || !password || !verifyPassword(password, _user.password)) {
      throw new Error('password error');
    }
  }
  const k8s_users = _user.k8s_users || [];
  const uid = _user.uid;
  let k8s_user = null;
  // migrating user
  if (k8s_users.length === 0) {
    const k8s_username = await getUserKubeconfigByuid(uid);
    if (!!k8s_username) {
      const result = await addK8sUser({
        id: '' + id,
        provider,
        k8s_user: {
          name: k8s_username
        }
      });
      if (!result) return Promise.reject('Faild to add k8s user');
      k8s_users.push(result);
    }
  }
  k8s_user = k8s_users[0];
  const k8s_username = k8s_user.name;
  // migrating namespace
  let namespace = await queryNS({ id: GetUserDefaultNameSpace(k8s_username) });
  if (!namespace) {
    namespace = await createNS({
      namespace: GetUserDefaultNameSpace(k8s_username),
      nstype: NSType.Private,
      teamName: 'private team'
    });
    if (!namespace) return Promise.reject('Faild to create namespace');
  }
  // migrating utn
  let utn = await queryUTN({ userId: uid, k8s_username, namespaceId: namespace.uid });
  if (!utn)
    utn = await createUTN({
      userId: _user.uid,
      k8s_username,
      namespaceId: namespace.uid,
      status: InvitedStatus.Accepted,
      role: UserRole.Owner
    });
  if (!utn) return Promise.reject('Faild to add namesapce');
  const user: User = {
    ..._user,
    k8s_users
  };
  return {
    user,
    k8s_user,
    namespace
  };
}
async function signUp({
  provider,
  id,
  name,
  avatar_url,
  password
}: {
  provider: Provider;
  id: string;
  name: string;
  avatar_url: string;
  password?: string;
}) {
  const ns_uid = uuid();
  let user: User | null = null;
  if (provider === 'password_user') {
    if (!password) return null;
    user = await createUser({ id, provider, name, avatar_url, password: hashPassword(password) });
  } else {
    user = await createUser({ id, provider, name, avatar_url });
  }
  if (!user) return null;
  const k8s_users = user.k8s_users || [];
  const userId = user.uid;
  if (!k8s_users) return null;
  const k8s_user = k8s_users[0];
  const k8s_username = k8s_user.name;
  const namespace = await createNS({
    namespace: GetUserDefaultNameSpace(k8s_username),
    nstype: NSType.Private,
    teamName: 'private team',
    uid: ns_uid
  });
  if (!namespace) return null;
  const utn = await createUTN({
    namespaceId: namespace.uid,
    k8s_username: k8s_user.name,
    userId,
    status: InvitedStatus.Accepted,
    role: UserRole.Owner
  });
  if (!utn) return null;
  return {
    user,
    k8s_user,
    namespace
  };
}
export function signUpByPassword({ password, username }: { password: string; username: string }) {
  return signUp({
    provider: 'password_user',
    id: username,
    name: username,
    avatar_url: '',
    password
  });
}
export async function signInByPassword({
  password,
  username
}: {
  password: string;
  username: string;
}) {
  const _user = await queryUser({ id: username, provider: 'password_user' });
  if (!_user) return null;
  return signIn({
    userResult: _user,
    provider: 'password_user',
    password,
    id: username
  }).then(
    (v) => v,
    (_) => Promise.resolve(null)
  );
}
export async function passwrodUserIsExist({ username: id }: { username: string }) {
  const result = await queryUser({ id, provider: 'password_user' });
  return result && result.password && result.password !== hashPassword('');
}
