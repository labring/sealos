import { connectToDatabase } from './mongodb';
import { UserRole } from '@/types/team';

type TWorkspace_invite_link = {
  role: UserRole;
  code: string; // unique
  workspaceUid: string;
  createdAt: Date;
  inviterUid: string;
  inviterCrUid: string;
};

async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TWorkspace_invite_link>('workspace_invite_links');
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 30 });
  await collection.createIndex({ code: 1 }, { unique: true });
  return collection;
}

export async function addOrUpdateInviteCode({
  code,
  inviterUid,
  role,
  workspaceUid,
  inviterCrUid
}: Omit<TWorkspace_invite_link, 'createdAt'>) {
  const codes = await connectToUserCollection();
  const result = await codes.updateOne(
    {
      inviterCrUid,
      inviterUid,
      role,
      workspaceUid
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

export async function getInviteCode({
  inviterUid,
  role,
  workspaceUid,
  inviterCrUid
}: Omit<TWorkspace_invite_link, 'createdAt' | 'code'>) {
  const codes = await connectToUserCollection();
  const result = await codes.findOne({
    inviterUid,
    inviterCrUid,
    workspaceUid,
    role
  });
  return result;
}

export async function findInviteCode(code: string) {
  const codes = await connectToUserCollection();
  const result = await codes.findOne({
    code
  });
  return result;
}
