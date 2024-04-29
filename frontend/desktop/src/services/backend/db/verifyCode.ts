import { v4 } from 'uuid';
import { connectToDatabase } from './mongodb';
export type SmsType = 'phone' | 'email';
export type TVerification_Codes = {
  id: string;
  smsType: SmsType;
  code: string;
  uid: string;
  createdAt: Date;
};

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TVerification_Codes>('sms_verification_codes');
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 5 });
  await collection.createIndex({ uid: 1 }, { unique: true });
  await collection.createIndex({ id: 1, smsType: 1 }, { unique: true });
  return collection;
}

// addOrUpdateCode
export async function addOrUpdateCode({
  id,
  smsType,
  code
}: {
  id: string;
  code: string;
  smsType: SmsType;
}) {
  const codes = await connectToCollection();
  const result = await codes.updateOne(
    {
      id,
      smsType
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
export async function checkSendable({ id, smsType }: { id: string; smsType: SmsType }) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    id,
    smsType,
    createdAt: {
      $gt: new Date(new Date().getTime() - 60 * 1000)
    }
  });
  return !result;
}
// checkCode
export async function checkCode({
  id,
  smsType,
  code
}: {
  id: string;
  code: string;
  smsType: SmsType;
}) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    id,
    smsType,
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
