import { connectToDatabase } from './mongodb';
import { PROVIDERS, Provider } from '@/types/user';
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
  return collection
}
export interface K8s_user {
  name: string;
}
interface User {
  uid: string;
  avatar_url: string;
  name: string;
  github?: string;
  wechat?: string;
  phone?: string;
  k8s_users?: K8s_user[];
  created_time: string;
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
export async function updateUser({ id, provider, name, avatar_url }: {
  id: string,
  provider: Provider,
  name?: string,
  avatar_url?: string
}) {
  const users = await connectToUserCollection();

  let _user = {
  } as any
  name && (_user.name = name)
  avatar_url && (_user.avatar_url = avatar_url)

  let user = null
  if (verifyProvider(provider)) {
    user = await users.updateOne({ [provider]: id }, { $set: _user });
  } else {
    throw new Error('provider error')
  }
  return user
}
export async function addK8sUser({ id, provider, k8s_user }: {
  id: string,
  provider: Provider,
  k8s_user?: K8s_user
}) {
  const users = await connectToUserCollection();
  
  if(k8s_user === undefined) {
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
    result = await users.updateOne({ [provider]: id }, { $pull: { k8s_users: {name: k8s_username} } });
  } else {
    throw new Error('provider error')
  }
  return result
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

function verifyProvider(provider: string): provider is Provider {
  return PROVIDERS.includes(provider as Provider)
}

// export async function removeUser({ id, provider, name, avatar_url }: {
//   id: string,
//   provider: Provider,
//   name?: string,
//   avatar_url?: string
// }) {
//   const users = await connectToUserCollection();

//   let user = null
//   switch (provider) {
//     case 'github':
//       user = await users.deleteOne({ github: id });
//       break;
//     case 'wechat':
//       user = await users.deleteOne({ wechat: id });
//       break;
//     case 'phone':
//       user = await users.deleteOne({ phone: id });
//       break;
//     case 'default':
//       user = await users.deleteOne({ uid: id });
//       break;
//     default:
//       throw new Error('provider error')
//       break;
//   }
//   return user
// }