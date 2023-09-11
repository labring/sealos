import { NSType, Namespace } from '@/types/team';
import { connectToDatabase } from './mongodb';
import { v4 as uuid } from 'uuid';
import { WithId } from 'mongodb';
async function connectToNSCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<Namespace>('namespace');
  await collection.createIndex({ uid: 1 }, { unique: true });
  return collection;
}

// export type Namespace = {
//   // uuid v4
//   uid: string;
//   // ns 的名字 ns-xxx
//   id: string;
//   createTime: Date;
//   // 展示到前端的名字
//   teamName: string;
//   readonly nstype: NSType;
// };

export async function queryNS({ id }: { id: string }) {
  const collection = await connectToNSCollection();
  const ns = await collection.findOne({ id });
  return ns;
}
export async function queryNSes(uids: string[]) {
  const collection = await connectToNSCollection();
  const ns = await collection
    .find({
      uid: uids
    })
    .toArray();
  return ns;
}
export async function queryNSByUid({ uid }: { uid: string }) {
  const collection = await connectToNSCollection();
  const ns = await collection.findOne({ uid });
  return ns;
}
export async function createNS({
  namespace: id,
  // k8s_username,
  nstype,
  // userId,
  teamName,
  uid = uuid()
}: // status = UserNsStatus.Accepted
{
  // userId: string;
  namespace: string;
  // k8s_username: string;
  nstype: NSType;
  teamName: string;
  uid?: string;
  // status?: UserNsStatus
}): Promise<null | WithId<Namespace>> {
  const collection = await connectToNSCollection();
  const createTime = new Date();
  const ns: Namespace = {
    teamName,
    id,
    uid,
    createTime,
    nstype
  };
  const result = await collection.insertOne(ns);
  if (!result.acknowledged) return null;
  return {
    _id: result.insertedId,
    ...ns
  };
}
// export async function removeNS({ uid }: { uid: string }) {
//   const collection = await connectToNSCollection();
//   const result = await collection.deleteOne({
//     uid
//   });
//   return result.acknowledged;
// }
