import { v4 } from 'uuid';
import { connectToDatabase } from './mongodb';

export type TEmailVerification_Codes = {
  email: string;
  code: string;
  uid: string;
  createdAt: Date;
};

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TEmailVerification_Codes>('email_verification_codes');
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 5 });
  await collection.createIndex({ uid: 1 }, { unique: true });
  return collection;
}

// addOrUpdateCode
export async function addOrUpdateCode({ email, code }: { email: string; code: string }) {
  const codes = await connectToCollection();
  const result = await codes.updateOne(
    {
      email
    },
    {
      $set: {
        code,
        createdAt: new Date(),
        uid: v4()
      }
    },
    {
      upsert: true
    }
  );
  return result;
}
// checkCode
export async function checkSendable({ email }: { email: string }) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    email,
    createdAt: {
      $gt: new Date(new Date().getTime() - 60 * 1000)
    }
  });
  return !result;
}
// checkCode
export async function checkCode({ email, code }: { email: string; code: string }) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    email,
    code,
    createdAt: {
      $gt: new Date(new Date().getTime() - 5 * 60 * 1000)
    }
  });
  return result;
}
export async function getInfoByUid({ uid }: { uid: string }) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    uid
  });
  return result;
}
export async function deleteByUid({ uid }: { uid: string }) {
  const codes = await connectToCollection();
  const result = await codes.deleteOne({
    uid
  });
  return result;
}
