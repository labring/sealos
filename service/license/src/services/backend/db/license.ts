import { LicensePayload, LicenseRecord } from '@/types';
import { connectToDatabase } from './mongodb';

async function connectLicenseRecordCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<LicenseRecord>('licenseRecord');
  return collection;
}

export async function createLicenseRecord({
  uid,
  amount,
  token,
  orderID,
  quota,
  paymentMethod
}: LicensePayload) {
  const collection = await connectLicenseRecordCollection();

  const now = Math.floor(Date.now() / 1000); // Get current timestamp in seconds
  const oneDayInSeconds = 24 * 60 * 60; // One day in seconds

  const record: LicenseRecord = {
    uid: uid,
    token: token,
    orderID: orderID,
    paymentMethod: paymentMethod,
    service: {
      quota: quota
    },
    iat: now, // Store the current timestamp as iat
    exp: now + oneDayInSeconds, // Set expiration to one day from now (in seconds)
    amount: amount
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
