import { ClusterDB, ClusterRecordPayload, ClusterType, LicenseRecordPayload } from '@/types';
import { createLicenseRecord, findLicenseByUIDAndOrderID } from './license';
import { connectToDatabase } from './mongodb';
import { getOssUrl } from './oss';
import { v4 as uuid } from 'uuid';

async function connectClusterCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<ClusterDB>('cluster');
  return collection;
}

export async function createClusterRecord(payload: ClusterRecordPayload) {
  const collection = await connectClusterCollection();
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 30 * 60000); // 30 minutes in milliseconds
  const tarUrl = await getOssUrl({ fileName: 'sealos-cloud-dev.tar.gz' });
  const md5Url = await getOssUrl({ fileName: 'sealos-cloud-dev.tar.gz.md5' });

  let orderID;
  let licenseID;

  if (payload.type === ClusterType.Enterprise) {
    // 当类型为 'company' 时，设置 orderID 和 licenseID
    orderID = payload.orderID;
    const _license = await findLicenseByUIDAndOrderID({
      uid: payload.uid,
      orderID: payload?.orderID || ''
    });
    licenseID = _license?._id;
  }

  const record: ClusterDB = {
    clusterId: uuid(),
    uid: payload.uid, // user ID
    orderID: orderID, // order ID
    licenseID: licenseID, // license ID
    type: payload.type,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await collection.insertOne(record);
  return result;
}

export async function getClusterRecordsByUid({
  uid,
  page,
  pageSize
}: {
  uid: string;
  page: number;
  pageSize: number;
}) {
  const collection = await connectClusterCollection();

  const skip = (page - 1) * pageSize;

  const query = { uid: uid };
  const options = {
    skip: skip,
    limit: pageSize
  };

  // Find records for the specified uid, skip records based on pagination, and limit the result to pageSize
  const records = await collection.find(query, options).toArray();

  // Calculate the total count of records for the given uid
  const totalCount = await collection.countDocuments(query);

  const result = {
    records: records,
    total: totalCount
  };

  return result;
}

export async function createClusterAndLicense({
  licensePayload,
  clusterPayload
}: {
  licensePayload: LicenseRecordPayload;
  clusterPayload: ClusterRecordPayload;
}) {
  const db = await connectToDatabase();
  const session = db.startSession();
  try {
    session.startTransaction();
    // 创建许可证记录
    const licenseResult = await createLicenseRecord(licensePayload);
    // 创建集群记录
    const clusterResult = await createClusterRecord({
      ...clusterPayload,
      licenseID: licenseResult.insertedId
    });

    if (!clusterResult || !licenseResult) {
      throw new Error('Failed to create cluster or license record');
    }

    await session.commitTransaction();
  } catch (err) {
    console.log(`[Transaction] Error: ${err}`);
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
}

export async function findClusterByUIDAndClusterID({
  uid,
  clusterId
}: {
  uid: string;
  clusterId: string;
}) {
  const collection = await connectClusterCollection();

  const cluster = await collection.findOne(
    { uid, clusterId },
    { projection: { _id: 0, uid: 0, updatedAt: 0 } }
  );

  return cluster;
}
