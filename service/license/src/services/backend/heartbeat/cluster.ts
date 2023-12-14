import { connectToDatabase } from '@/services/backend/db/mongodb';
import { ClusterHeartbeatPayload, ClusterHeartbeatRecord } from '@/types/heartbeat/cluster';

async function connectClusterHeartbeatRecordCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<ClusterHeartbeatRecord>('heartbeat');
  return collection;
}

export async function ClusterHeartbeat(payload: ClusterHeartbeatPayload) {
  const collection = await connectClusterHeartbeatRecordCollection();

  const now = new Date();
  const record: ClusterHeartbeatRecord = {
    clusterID: payload.clusterID,
    clusterResource: payload.clusterResource,
    createdAt: now,
    updatedAt: now
  };

  const oldRecord = await collection.findOne({ clusterID: record.clusterID });
  if (oldRecord) {
    record.createdAt = oldRecord.createdAt;
  }

  return await collection.findOneAndReplace({ clusterID: record.clusterID }, record, {
    upsert: true,
    returnDocument: 'after'
  });
}
