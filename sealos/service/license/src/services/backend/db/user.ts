import { connectToDatabase } from './mongodb';
import { AUTH_PROVIDERS, AuthProvider, User } from '@/types/user';
import { hashPassword } from '@/utils/crypto';
import { v4 as uuid } from 'uuid';

async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<User>('user');
  await collection.createIndex({ uid: 1 }, { unique: true });
  return collection;
}

export async function queryUser({ id, provider }: { id: string; provider: AuthProvider }) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.findOne({ [provider]: id });
}

export async function createUser({
  id,
  provider,
  name,
  avatar_url,
  password
}: {
  id: string;
  provider: AuthProvider;
  name: string;
  avatar_url: string;
  password?: string;
}) {
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  const users = await connectToUserCollection();
  const uid = uuid();

  const user: User = {
    uid,
    avatar_url,
    name,
    created_time: new Date().toISOString(),
    [provider]: id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (password) {
    user.password = hashPassword(password);
  }

  await users.insertOne(user);
  return user;
}

export async function updateUser({
  id,
  provider,
  data
}: {
  id: string;
  provider: AuthProvider;
  data: Partial<User>;
}) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.updateOne({ [provider]: id }, { $set: data });
}

function verifyProvider(provider: string): provider is AuthProvider {
  return AUTH_PROVIDERS.includes(provider as AuthProvider);
}

export async function removeUser({ id, provider }: { id: string; provider: AuthProvider }) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.deleteOne({ [provider]: id });
}
