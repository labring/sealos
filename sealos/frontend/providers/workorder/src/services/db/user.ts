import { UserDB } from '@/types/user';
import { connectToDatabase } from './mongodb';

async function connectUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<UserDB>('user');
  return collection;
}

export async function createUser(user: UserDB) {
  const collection = await connectUserCollection();
  const result = await collection.insertOne(user, {});
  return result;
}

export async function getUserById(userId: string) {
  const collection = await connectUserCollection();
  const user = await collection.findOne({ userId });
  return user;
}

export async function updateUser(userId: string, updates: Partial<UserDB>) {
  const collection = await connectUserCollection();
  const result = await collection.updateOne({ userId }, { $set: updates });
  return result;
}

export async function deleteUser(userId: string) {
  const collection = await connectUserCollection();
  const result = await collection.deleteOne({ userId });
  return result;
}
