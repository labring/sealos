import { LicenseDB, LicenseRecordPayload, LicenseToken } from '@/types';
import { base64Decode } from '@/utils/tools';
import { sign } from 'jsonwebtoken';
import { connectToDatabase } from './mongodb';

export const ExpiredTime = 30 * 24 * 60 * 60;

async function connectLicenseCollection() {
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
  payMethod,
  type,
  clusterId,
  cpu,
  memory,
  months,
  expiredTime = ExpiredTime
}: LicenseRecordPayload) {
  const collection = await connectLicenseCollection();

  const now = Math.floor(Date.now() / 1000); // Get current timestamp in seconds

  const record: LicenseDB = {
    uid: uid,
    token: token,
    orderID: orderID,
    payMethod: payMethod,
    service: {
      quota: quota
    },
    iat: now, // Store the current timestamp as iat
    exp: now + expiredTime, // Set expiration to one day from now (in seconds)
    amount: amount,
    type: type,
    createdAt: new Date(),
    updatedAt: new Date(),
    clusterId: clusterId,
    cpu,
    memory,
    months
  };

  const result = await collection.insertOne(record);

  return result;
}

export async function findLicenseByUIDAndOrderID({
  uid,
  orderID
}: {
  uid: string;
  orderID: string;
}) {
  const collection = await connectLicenseCollection();

  const query = {
    uid: uid,
    orderID: orderID
  };

  const licenseRecord = await collection.findOne(query);

  return licenseRecord;
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
  const collection = await connectLicenseCollection();

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

export function generateLicenseToken(payload: LicenseToken, time: number) {
  const privateKey = process.env.LICENSE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('LICENSE PRIVATE KEY IS MISSING');
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expirationTime = nowInSeconds + time; // Valid for three days by default

  const _payload = {
    iss: 'Sealos',
    iat: nowInSeconds,
    exp: expirationTime,
    type: payload.type,
    clusterID: payload.clusterID,
    data: {
      totalCPU:
        typeof payload.data.totalCPU === 'number'
          ? payload.data.totalCPU
          : parseInt(payload.data.totalCPU),
      totalMemory:
        typeof payload.data.totalMemory === 'number'
          ? payload.data.totalMemory
          : parseInt(payload.data.totalMemory),
      nodeCount:
        typeof payload.data.nodeCount === 'number'
          ? payload.data.nodeCount
          : parseInt(payload.data.nodeCount)
    }
  };

  const token = sign(_payload, base64Decode(privateKey), { algorithm: 'RS256' });
  return token;
}

export async function hasIssuedLicense({ uid, orderID }: { uid: string; orderID: string }) {
  try {
    const collection = await connectLicenseCollection();

    const existingLicense = await collection.findOne({
      uid: uid,
      orderID: orderID
    });

    return !!existingLicense; // 如果找到匹配的记录，返回 true；否则返回 false
  } catch (error) {
    throw new Error('Error checking for issued license:');
  }
}

export async function getLicenseRecordsByUidAndClusterId({
  uid,
  clusterId,
  page,
  pageSize
}: {
  uid: string;
  clusterId: string;
  page: number;
  pageSize: number;
}) {
  const collection = await connectLicenseCollection();
  const skip = (page - 1) * pageSize;
  const query = { uid: uid, clusterId: clusterId };
  const options = {
    skip: skip,
    limit: pageSize
  };
  const records = await collection.find(query, options).sort({ iat: -1 }).toArray();
  const totalCount = await collection.countDocuments(query);
  const result = {
    records: records,
    total: totalCount
  };
  return result;
}

export async function hasHistoricalLicense(uid: string) {
  const collection = await connectLicenseCollection();
  const query = { uid: uid, clusterId: { $exists: false } };
  const latestRecord = await collection.findOne(query, { sort: { iat: -1 } });

  if (latestRecord) {
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    const expTimestamp = latestRecord.exp;
    const isExpired = expTimestamp && expTimestamp < currentTimestamp;

    return !isExpired;
  }

  return false;
}
