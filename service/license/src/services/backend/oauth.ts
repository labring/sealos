import { Session } from '@/types';
import { AuthProvider, User } from '@/types/user';
import { verifyPassword } from '@/utils/crypto';
import { WithId } from 'mongodb';
import { generateJWT } from './auth';
import { createUser, queryUser } from './db/user';

export const getOauthRes = async ({
  provider,
  id,
  name,
  avatar_url,
  password
}: {
  provider: AuthProvider;
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
  const { user } = signResult;

  const token = generateJWT({
    uid: user.uid,
    [provider]: id
  });

  return {
    token,
    user: {
      name: user.name,
      avatar: user.avatar_url
    }
  };
};

async function signIn({
  userResult: _user,
  provider,
  id,
  password
}: {
  provider: AuthProvider;
  id: string;
  password?: string;
  userResult: WithId<User>;
}) {
  if (provider === 'password_user') {
    if (!_user.password || !password || !verifyPassword(password, _user.password)) {
      throw new Error('password error');
    }
  }
  return { user: _user };
}

async function signUp({
  provider,
  id,
  name,
  avatar_url,
  password
}: {
  provider: AuthProvider;
  id: string;
  name: string;
  avatar_url: string;
  password?: string;
}) {
  const user = await createUser({ id, provider, name, avatar_url, password });
  return { user };
}
