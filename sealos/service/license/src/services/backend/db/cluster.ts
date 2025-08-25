import { ClusterDB, ClusterRecordPayload, LicenseRecordPayload } from '@/types';
import { v4 as uuid } from 'uuid';
import { connectToDatabase } from './mongodb';
import { createLicenseRecord } from './license';
import { ObjectId } from 'mongodb';

async function connectClusterCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<ClusterDB>('cluster');
  // await collection.createIndex({ clusterId: 1 }, { unique: true });
  // await collection.createIndex({ kubeSystemID: 1 }, { unique: true });
  return collection;
}

export async function createClusterRecord(payload: ClusterRecordPayload) {
  const collection = await connectClusterCollection();
  // const now = new Date();
  // const expirationTime = new Date(now.getTime() + 30 * 60000); // 30 minutes in milliseconds
  // const tarUrl = await getOssUrl({ fileName: 'sealos-cloud-dev.tar.gz' });
  // const md5Url = await getOssUrl({ fileName: 'sealos-cloud-dev.tar.gz.md5' });

  let orderID = payload.orderID;

  const record: ClusterDB = {
    clusterId: uuid(),
    uid: payload.uid, // user ID
    orderID: orderID, // order ID
    type: payload.type,
    createdAt: new Date(),
    updatedAt: new Date(),
    cpu: payload.cpu,
    memory: payload.memory,
    months: payload.months,
    displayName: payload.name
  };

  await collection.insertOne(record);
  return record;
}

export async function getClusterRecordsByUid({
  uid,
  page,
  pageSize,
  includeDeleted = false
}: {
  uid: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
}) {
  const collection = await connectClusterCollection();

  const skip = (page - 1) * pageSize;

  const query = includeDeleted ? { uid } : { uid, isDeleted: { $ne: true } };
  const projection = { _id: 0 };
  const options = {
    skip: skip,
    limit: pageSize,
    sort: { createdAt: -1 } as Record<string, 1 | -1>,
    projection: projection
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

export async function findClusterByUIDAndSystemId({
  uid,
  systemId
}: {
  uid: string;
  systemId: string;
}) {
  const collection = await connectClusterCollection();

  const cluster = await collection.findOne(
    { uid, kubeSystemID: systemId },
    { projection: { _id: 0, uid: 0, updatedAt: 0 } }
  );

  return cluster;
}

export async function updateCluster(params: {
  uid: string;
  clusterId: string;
  updates: {
    displayName?: string;
    kubeSystemID?: string;
    licenseID?: ObjectId;
    kubeSystemUpdateAt?: Date;
  };
}) {
  const { uid, clusterId, updates } = params;
  const collection = await connectClusterCollection();
  const filter = { uid: uid, clusterId: clusterId };

  const update = {
    $set: {
      ...updates,
      updatedAt: new Date()
    }
  };

  const updatedCluster = await collection.findOneAndUpdate(filter, update, {
    returnDocument: 'after'
  });

  return updatedCluster;
}

export async function deleteClusterRecord({
  uid,
  clusterId
}: {
  uid: string;
  clusterId: string;
}): Promise<boolean> {
  const collection = await connectClusterCollection();

  const filter = { uid, clusterId };
  const update = { $set: { isDeleted: true } };
  const result = await collection.updateOne(filter, update);

  return result.modifiedCount === 1;
}

export async function isKubeSystemIDBound(kubeSystemID: string): Promise<boolean> {
  const collection = await connectClusterCollection();
  const result = await collection.findOne({ kubeSystemID: kubeSystemID });
  return !!result;
}

export async function updateDisplayName(params: {
  uid: string;
  clusterId: string;
  displayName: string;
}) {
  const { uid, clusterId, displayName } = params;
  const collection = await connectClusterCollection();

  const filter = { uid: uid, clusterId: clusterId };

  const update = {
    $set: {
      displayName: displayName,
      updatedAt: new Date()
    }
  };

  const updatedCluster = await collection.findOneAndUpdate(filter, update, {
    returnDocument: 'after'
  });

  return updatedCluster;
}

export async function updateKubeSystemID(params: {
  uid: string;
  clusterId: string;
  kubeSystemID: string;
}) {
  const { uid, clusterId, kubeSystemID } = params;
  const collection = await connectClusterCollection();

  const filter = { uid: uid, clusterId: clusterId };

  const update = {
    $set: {
      kubeSystemID: kubeSystemID,
      updatedAt: new Date(),
      kubeSystemUpdateAt: new Date()
    }
  };

  const updatedCluster = await collection.findOneAndUpdate(filter, update, {
    returnDocument: 'after'
  });

  return updatedCluster;
}

export async function updateClusterIdAndIssueLicense({
  uid,
  clusterId,
  kubeSystemID,
  licensePayload
}: {
  uid: string;
  clusterId: string;
  kubeSystemID: string;
  licensePayload: LicenseRecordPayload;
}) {
  const db = await connectToDatabase();
  const session = db.startSession();

  try {
    session.startTransaction();
    const licenseResult = await createLicenseRecord(licensePayload);

    // 更新 kubeSystemID 和 licenseID
    const updateResult = await updateCluster({
      uid: uid,
      clusterId: clusterId,
      updates: {
        kubeSystemID: kubeSystemID,
        licenseID: licenseResult.insertedId,
        kubeSystemUpdateAt: new Date()
      }
    });

    if (!updateResult || !licenseResult) {
      throw new Error('Failed to create license or update cluster');
    }

    await session.commitTransaction();
    return updateResult;
  } catch (err) {
    console.log(`[Transaction] Error: ${err}`);
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
}
