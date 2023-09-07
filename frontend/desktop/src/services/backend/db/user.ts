import { connectToDatabase } from './mongodb';
import { K8s_user, PROVIDERS, Provider, User } from '@/types/user';
import { customAlphabet } from 'nanoid';
import { v4 as uuid } from 'uuid';
const LetterBytes = 'abcdefghijklmnopqrstuvwxyz0123456789';
const HostnameLength = 8;

const nanoid = customAlphabet(LetterBytes, HostnameLength);
async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<User>('user');
  await collection.createIndex({ uid: 1 }, { unique: true });
  await collection.createIndex({ 'k8s_users.name': 1 }, { unique: true, sparse: true });
  await collection.createIndex({ password_user: 1 }, { unique: true, sparse: true });
  return collection;
}

export async function queryUser({ id, provider }: { id: string; provider: Provider }) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.findOne({ [provider]: id });
}
export async function queryUserByk8sUser(k8s_useranme: string) {
  const users = await connectToUserCollection();
  return await users.findOne({ 'k8s_users.name': k8s_useranme });
}
export async function createUser({
  id,
  provider,
  name,
  avatar_url
}: {
  id: string;
  provider: Provider;
  name: string;
  avatar_url: string;
}) {
  const users = await connectToUserCollection();

  let uid = uuid();
  const k8s_username = await get_k8s_username();
  let user: User = {
    uid,
    avatar_url,
    name,
    created_time: new Date().toISOString(),
    k8s_users: [
      {
        name: k8s_username
      }
    ]
  };
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  user[provider] = id;
  await users.insertOne(user);
  return user;
}
export async function updateUser({
  id,
  provider,
  data
}: {
  id: string;
  provider: Provider;
  data: Partial<Omit<User, 'provider'>>;
}) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.updateOne({ [provider]: id }, { $set: data });
}
export async function addK8sUser({
  id,
  provider,
  k8s_user
}: {
  id: string;
  provider: Provider;
  k8s_user: K8s_user;
}) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  const result = await users.findOneAndUpdate(
    { [provider]: id },
    { $addToSet: { k8s_users: k8s_user } }
  );
  if (!result.ok) {
    return null;
  }
  return result.value;
}
export async function removeK8sUser({
  id,
  provider,
  k8s_username
}: {
  id: string;
  provider: Provider;
  k8s_username: string;
}) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.updateOne(
    { [provider]: id },
    { $pull: { k8s_users: { name: k8s_username } } }
  );
}
function verifyProvider(provider: string): provider is Provider {
  return PROVIDERS.includes(provider as Provider);
}
export async function get_k8s_username() {
  const users = await connectToUserCollection();
  let k8s_username = nanoid();
  let len = 5;
  while ((await users.findOne({ k8s_users: { name: k8s_username } })) && len--) {
    k8s_username = nanoid();
  }
  if (len < 0) {
    return Promise.reject('user are too many to be created');
  }
  return k8s_username;
}
export async function removeUser({ id, provider }: { id: string; provider: Provider }) {
  const users = await connectToUserCollection();
  if (!verifyProvider(provider)) return Promise.reject('provider error');
  return await users.deleteOne({ [provider]: id });
}
// export async function addUserNS({
//   id,
//   provider,
//   // ns_uid,
//   k8s_username
// }: {
//   id: string;
//   provider: Provider;
//   // ns_uid: string;
//   k8s_username: string;
// }) {
//   const userCollection = await connectToUserCollection();
//   if (!verifyProvider(provider)) return Promise.reject('provider error');
//   const result = await userCollection.updateOne(
//     {
//       [provider]: id,
//       'k8s_users.name': k8s_username
//     },
//     {
//       $push: {
//         'k8s_users.$.namespaces': { uid: ns_uid }
//       }
//     }
//   );
//   return result.acknowledged;
// }
// export async function removeUserNs({
//   id,
//   provider,
//   ns_uid,
//   k8s_username
// }: {
//   id: string;
//   provider: Provider;
//   ns_uid: string;
//   k8s_username: string;
// }) {
//   const userCollection = await connectToUserCollection();
//   if (!verifyProvider(provider)) return Promise.reject('provider error');
//   const result = await userCollection.findOneAndUpdate(
//     {
//       [provider]: id,
//       'k8s_users.name': k8s_username
//     },
//     {
//       $pull: {
//         'k8s_users.$.namespaces': {
//           uid: ns_uid
//         }
//       }
//     }
//   );
//   return result.value;
// }
// export async function getUserNs({
//   id,
//   provider,
//   k8s_username
// }: {
//   id: string;
//   provider: Provider;
//   k8s_username?: string;
// }) {
//   const userCollection = await connectToUserCollection();
//   if (!verifyProvider(provider)) return Promise.reject('provider error');

//   if (!k8s_username) {
//     // 获取所有user的所有namespace !todo
//     const result = await userCollection.findOne({
//       [provider]: id
//     });
//     const k8s_users = result?.k8s_users || [];
//     if (k8s_users.length === 0) return [];
//     // 也许要去重？
//     return k8s_users.flatMap((k8s_user) => k8s_user.namespaces || []);
//   } else {
//     // 获取指定user的所有namespace
//     const result = await userCollection.findOne({
//       [provider]: id,
//       'k8s_users.name': k8s_username
//     });
//     const k8s_users = result?.k8s_users || [];
//     if (k8s_users.length === 0) return [];

//     return k8s_users[0].namespaces || [];
//   }
// }
