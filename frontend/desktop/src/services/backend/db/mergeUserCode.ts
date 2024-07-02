import { v4 } from 'uuid';
import { connectToDatabase } from './mongodb';
import { ProviderType } from 'prisma/global/generated/client';

export type TMergeUserCode = {
  code: string;
  providerId: string;
  providerType: ProviderType;
  uid: string;
  createdAt: Date;
};

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TMergeUserCode>('mergeUserCode');
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 1 });
  await collection.createIndex({ uid: 1 }, { unique: true });
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ providerId: 1, providerType: 1 }, { unique: true });
  return collection;
}

// addOrUpdateCode
export async function addOrUpdateCode({
  providerId,
  providerType,
  code
}: {
  providerId: string;
  providerType: ProviderType;
  code: string;
}) {
  const codes = await connectToCollection();
  const result = await codes.updateOne(
    {
      providerId,
      providerType
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
// export async function checkSendable({ providerId, providerType }: {
// 	providerId: string;
// 	providerType: ProviderType;
// }) {
// 	const codes = await connectToCollection();
// 	const result = await codes.findOne({
// 		providerId,
// 		providerType,
// 		createdAt: {
// 			$gt: new Date(new Date().getTime() - 60 * 1000)
// 		}
// 	});
// 	return !result;
// }
// checkCode
export async function checkCode({
  providerType,
  code
}: {
  providerType: ProviderType;
  code: string;
}) {
  const codes = await connectToCollection();
  const result = await codes.findOne({
    providerType,
    code,
    createdAt: {
      $gt: new Date(new Date().getTime() - 1 * 60 * 1000)
    }
  });
  return result;
}
// export async function getInfoByUid({ uid }: { uid: string }) {
// 	const codes = await connectToCollection();
// 	const result = await codes.findOne({
// 		uid
// 	});
// 	return result;
// }
export async function deleteByUid({ uid }: { uid: string }) {
  const codes = await connectToCollection();
  const result = await codes.deleteOne({
    uid
  });
  return result;
}
