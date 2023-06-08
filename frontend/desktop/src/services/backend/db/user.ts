import client from './mongodb';
import { Provider } from '@/types/user';
import { v4 as uuid } from 'uuid';

async function connectToUserCollection() {
  const collection = client.db().collection<User>('user');
  // console.log('connect to user collection')
  await collection.createIndex({ uid: 1 }, { unique: true })
  return collection
}
interface User {
  uid: string;
  avatar_url: string;
  name: string;
  github: string;
  wechat: string;
  phone: string;
  created_time: string;
}

export async function queryUser({ id, provider }:
  { id: string, provider: Provider }) {
  // console.log('query')
  const users = await connectToUserCollection();
  let user = null
  switch (provider) {
    case 'github':
      user = await users.findOne({ github: id });
      break;
    case 'wechat':
      user = await users.findOne({ wechat: id });
      break;
    case 'phone':
      user = await users.findOne({ phone: id });
      break;
    case 'default':
      user = await users.findOne({ uid: id })
      break;
    default:
      throw new Error('provider error')
      break;
  }
  return user
}
export async function createUser({ id, provider, name, avatar_url }: {
  id: string,
  provider: Provider,
  name: string,
  avatar_url: string
}) {
  const users = await connectToUserCollection();
  // console.log('create')
  let uid = uuid()
  
  let len = 4
  while (
    (await users.findOne({ uid }))
    && len--) {
    uid = uuid()
  }
  if (len < 0) {
    throw new Error('user are too many to be created')
  }
  let _user: User = {
    uid,
    avatar_url,
    name,
    github: '',
    wechat: '',
    phone: '',
    created_time: new Date().toISOString()
  }
  let user = {
    uid: _user.uid,
    avatar_url,
    name,
  } as User
  switch (provider) {
    case 'github':
      _user.github = id
      user.github = id
      await users.insertOne(_user);
      break;
    case 'wechat':
      _user.wechat = id
      user.wechat = id
      await users.insertOne(_user);
      break;
    case 'phone':
      _user.phone = id
      user.phone = id
      await users.insertOne(_user);
      break;
    case 'default':
      _user.uid = id
      user.uid = id
      await users.insertOne(_user);
      break;
    default:
      throw new Error('provider error')
      break;
  }
  return user
}
// export async function updateUser({ id, provider, name, avatar_url }: {
//   id: string,
//   provider: Provider,
//   name?: string,
//   avatar_url?: string
// }) {
//   const users = await connectToUserCollection();

//   let _user = {
//   } as any
//   name && (_user.name = name)
//   avatar_url && (_user.avatar_url = avatar_url)

//   let user = null
//   switch (provider) {
//     case 'github':
//       user = await users.updateOne({ github: id }, { $set: _user });
//       break;
//     case 'wechat':
//       user = await users.updateOne({ wechat: id }, { $set: _user });
//       break;
//     case 'phone':
//       user = await users.updateOne({ phone: id }, { $set: _user });
//       break;
//     case 'default':
//       user = await users.updateOne({ uid: id }, { $set: _user });
//       break;
//     default:
//       throw new Error('provider error')
//       break;
//   }
//   return user
// }
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