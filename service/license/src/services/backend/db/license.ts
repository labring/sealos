import { LicenseDB, LicenseRecordPayload, LicenseToken } from '@/types';
import { base64Decode } from '@/utils/tools';
import { sign } from 'jsonwebtoken';
import { connectToDatabase } from './mongodb';

async function connectLicenseRecordCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<LicenseDB>('license');
  return collection;
}

export async function createLicenseRecord({
  uid,
  amount,
  token,
  orderID,
  quota,
  payMethod
}: LicenseRecordPayload) {
  const collection = await connectLicenseRecordCollection();

  const now = Math.floor(Date.now() / 1000); // Get current timestamp in seconds
  const oneDayInSeconds = 3 * 24 * 60 * 60;

  const record: LicenseDB = {
    uid: uid,
    token: token,
    orderID: orderID,
    payMethod: payMethod,
    service: {
      quota: quota
    },
    iat: now, // Store the current timestamp as iat
    exp: now + oneDayInSeconds, // Set expiration to one day from now (in seconds)
    amount: amount,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collection.insertOne(record);

  return result;
}

export async function getLicenseRecordsByUid({
  uid,
  page,
  pageSize
}: {
  uid: string;
  page: number;
  pageSize: number;
}) {
  const collection = await connectLicenseRecordCollection();

  const skip = (page - 1) * pageSize;

  const query = { uid: uid };
  const options = {
    skip: skip,
    limit: pageSize
  };

  // Find records for the specified uid, skip records based on pagination, and limit the result to pageSize
  const records = await collection.find(query, options).sort({ iat: -1 }).toArray();

  // Calculate the total count of records for the given uid
  const totalCount = await collection.countDocuments(query);

  const result = {
    records: records,
    total: totalCount
  };

  return result;
}

export function generateLicenseToken(payload: LicenseToken) {
  const privateKey = process.env.LICENSE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('LICENSE PRIVATE KEY IS MISSING');
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expirationTime = nowInSeconds + 3 * 24 * 60 * 60;

  const _payload = {
    iss: 'Sealos',
    iat: nowInSeconds,
    exp: expirationTime,
    ...payload
  };

  const token = sign(_payload, base64Decode(privateKey), { algorithm: 'RS256' });
  return token;
}

export async function hasIssuedLicense({ uid, orderID }: { uid: string; orderID: string }) {
  try {
    const collection = await connectLicenseRecordCollection();

    const existingLicense = await collection.findOne({
      uid: uid,
      orderID: orderID
    });

    return !!existingLicense; // 如果找到匹配的记录，返回 true；否则返回 false
  } catch (error) {
    throw new Error('Error checking for issued license:');
  }
}
