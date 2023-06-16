import { connectToDatabase } from './mongodb';
import { PROVIDERS, Provider } from '@/types/user';
import { hashPassword } from '@/utils/crypto';
import { customAlphabet } from 'nanoid';
import { v4 as uuid } from 'uuid';
const LetterBytes = "abcdefghijklmnopqrstuvwxyz0123456789"
const HostnameLength = 8

const nanoid = customAlphabet(LetterBytes, HostnameLength)
async function connectToUserCollection() {
  const client = await connectToDatabase()
  const collection = client.db().collection<User>('user');
  await collection.createIndex({ uid: 1 }, { unique: true })
  await collection.createIndex({ 'k8s_users.name': 1 }, { unique: true, sparse: true })
  await collection.createIndex({ 'password_user': 1 }, { unique: true, sparse: true })
  return collection
}
export interface K8s_user {
  name: string;
}
type User = {
  uid: string;
  avatar_url: string;
  name: string;
  github?: string;
  wechat?: string;
  phone?: string;
  k8s_users?: K8s_user[];
  created_time: string;
  password?: string;
  password_user?: string;
}

export async function queryUser({ id, provider }:
  { id: string, provider: Provider }) {
  const users = await connectToUserCollection();
  let user = null
  if (verifyProvider(provider)) {
    user = await users.findOne({ [provider]: id })
    return user
  } else {
    throw new Error('provider error')
  }
}
export async function createUser({ id, provider, name, avatar_url }: {
  id: string,
  provider: Provider,
  name: string,
  avatar_url: string
}) {
  const users = await connectToUserCollection();

  let uid = uuid()
  const k8s_username = await get_k8s_username()
  let user: User = {
    uid,
    avatar_url,
    name,
    created_time: new Date().toISOString(),
    k8s_users: [{ name: k8s_username }]
  }
  if (verifyProvider(provider)) {
    user[provider] = id
    await users.insertOne(user);
  } else {
    throw new Error('provider error')
  }
  return user
}
export async function updateUser({ id, provider, data }: {
  id: string,
  provider: Provider,
  data: Partial<Omit<User, 'provider'>>
}) {
  const users = await connectToUserCollection();
  let user = null
  if (verifyProvider(provider)) {
    user = await users.updateOne({ [provider]: id }, { $set: data });
  } else {
    throw new Error('provider error')
  }
  return user
}
export async function addK8sUser({ id, provider, k8s_user }: {
  id: string,
  provider: Provider,
  k8s_user?: K8s_user,
}) {
  const users = await connectToUserCollection();

  if (k8s_user === undefined) {
    k8s_user = { name: await get_k8s_username() }
  }
  if (verifyProvider(provider)) {
    await users.updateOne({ [provider]: id }, { $addToSet: { k8s_users: k8s_user } });
  } else {
    throw new Error('provider error')
  }
  return k8s_user
}
export async function removeK8sUser({ id, provider, k8s_username }: {
  id: string,
  provider: Provider,
  k8s_username: string
}) {
  const users = await connectToUserCollection();
  let result = null
  if (verifyProvider(provider)) {
    result = await users.updateOne({ [provider]: id }, { $pull: { k8s_users: { name: k8s_username } } });
  } else {
    throw new Error('provider error')
  }
  return result
}

// export async function createUserByPassword({ name, password }: {
//   name: string,
//   password: string
// }) {
//   const users = await connectToUserCollection();
//   const avatar_url = ''
//   let uid = uuid()
//   const k8s_username = await get_k8s_username()
//   let user: User = {
//     uid,
//     avatar_url,
//     name,
//     password_user: name,
//     created_time: new Date().toISOString(),
//     k8s_users: [{ name: k8s_username }],
//     password
//   }
//   await users.insertOne(user);
//   return user
// }
// export async function verifyPassword({ name, password }: {
//   name: string,
//   password: string
// }) {
//   const users = await connectToUserCollection();
//   const user = await users.findOne({ password_user: name })
//   if (!user) {
//     return false
//   }
//   return user.password === hashPassword(password)
// }
function verifyProvider(provider: string): provider is Provider {
  return PROVIDERS.includes(provider as Provider)
}
async function get_k8s_username() {
  const users = await connectToUserCollection();
  let k8s_username = nanoid()
  let len = 5
  while (
    (await users.findOne({ namespaces: { name: k8s_username } }))
    && len--) {
    k8s_username = nanoid()
  }
  if (len < 0) {
    return Promise.reject('user are too many to be created')
  }
  return k8s_username
}
export async function removeUser({ id, provider }: {
  id: string,
  provider: Provider
}) {
  const users = await connectToUserCollection();
  let user = null
  if (verifyProvider(provider)) {
    user = await users.deleteOne({ [provider]: id });
  } else {
    throw new Error('provider error')
  }
  return user
}