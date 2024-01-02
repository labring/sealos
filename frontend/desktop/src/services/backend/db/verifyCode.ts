import { connectToDatabase } from './mongodb';

type TVerification_Codes = {
  phone: string;
  code: string;
  createdAt: Date;
};

async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TVerification_Codes>('verification_codes');
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 5 });
  return collection;
}

// addOrUpdateCode
export async function addOrUpdateCode({ phone, code }: { phone: string; code: string }) {
  const codes = await connectToUserCollection();
  const result = await codes.updateOne(
    {
      phone
    },
    {
      $set: {
        code,
        createdAt: new Date()
      }
    },
    {
      upsert: true
    }
  );
  return result;
}
// checkCode
export async function checkSendable({ phone }: { phone: string }) {
  const codes = await connectToUserCollection();
  const result = await codes.findOne({
    phone,
    createdAt: {
      // 在区间范围内找到就是已经发送过了，不能再发了
      $gt: new Date(new Date().getTime() - 60 * 1000)
    }
  });
  return !result;
}
// checkCode
export async function checkCode({ phone, code }: { phone: string; code: string }) {
  const codes = await connectToUserCollection();
  const result = await codes.findOne({
    phone,
    code,
    createdAt: {
      // 5分钟内有效
      $gt: new Date(new Date().getTime() - 5 * 60 * 1000)
    }
  });
  return !!result;
}
