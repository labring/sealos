import { connectToDatabase } from './mongodb';
import { subMinutes } from 'date-fns';

type TVerification_Codes = {
  phone: string;
  code: string;
  ip: string;
  createdTime: Date;
};

async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TVerification_Codes>('verification_codes');
  // console.log('connect to verification_codes collection')
  await collection.createIndex({ createdTime: 1 }, { expireAfterSeconds: 60 * 5 });
  return collection;
}

// addOrUpdateCode
export async function addOrUpdateCode({
  phone,
  code,
  ip
}: {
  phone: string;
  code: string;
  ip: string;
}) {
  const codes = await connectToUserCollection();
  const result = await codes.updateOne(
    {
      phone
    },
    {
      $set: {
        code,
        phone,
        ip,
        createdTime: new Date()
      }
    },
    {
      upsert: true
    }
  );
  return result;
}

// checkCode
export async function checkSendable({ phone, ip }: { phone?: string; ip: string }) {
  const codes = await connectToUserCollection();
  const result = await codes.findOne({
    $or: [
      {
        ip
      },
      {
        phone
      }
    ],
    createdTime: {
      $gt: subMinutes(new Date(), 1),
      $lt: new Date()
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
    createdTime: {
      $gt: subMinutes(new Date(), 5)
    }
  });
  return !!result;
}
