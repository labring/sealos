import { InvitedStatus, Namespace, UserRole } from '@/types/team';
import { connectToDatabase } from './mongodb';
import { User } from '@/types/user';
import { ClientSession } from 'mongodb';
export async function connectToUTN() {
  const client = await connectToDatabase();
  const collection = client.db().collection<TUserToNamespace>('userToNs');
  return collection;
}
type TUserToNamespace = {
  userId: string;
  k8s_username: string;
  namespaceId: string;
  status: InvitedStatus;
  joinTime?: Date;
  role: UserRole;
  createTime: Date;
  updateTime?: Date;
  // 发起操作的人
  managerId?: string;
};
export async function createUTN({
  userId,
  k8s_username,
  namespaceId,
  status = InvitedStatus.Inviting,
  role = UserRole.Developer,
  managerId
}: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
  status?: InvitedStatus;
  role?: UserRole;
  managerId?: string;
}) {
  const collection = await connectToUTN();
  const utn: TUserToNamespace = {
    userId,
    k8s_username,
    namespaceId,
    status,
    role,
    createTime: new Date(),
    updateTime: new Date(),
    joinTime: new Date()
  };
  if (managerId) utn.managerId = managerId;
  const result = await collection.insertOne(utn);
  if (!result.acknowledged) return null;
  return {
    _id: result.insertedId,
    ...utn
  };
}

export async function updateUTN({
  userId,
  k8s_username,
  namespaceId,
  session,
  ...data
}: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
  session?: ClientSession;
  status?: InvitedStatus;
  role?: UserRole;
  joinTime?: Date;
}) {
  const collection = await connectToUTN();
  const result = await collection.findOneAndUpdate(
    {
      userId,
      k8s_username,
      namespaceId
    },
    {
      $set: {
        ...data,
        updateTime: new Date()
      }
    },
    {
      session
    }
  );
  return result.value;
}
export async function queryNamespacesByUser({
  userId,
  k8s_username
}: {
  userId: string;
  k8s_username: string;
}) {
  const collection = await connectToUTN();
  const result = await collection
    .aggregate<
      {
        namespace: Namespace;
      } & TUserToNamespace
    >([
      {
        $match: {
          userId,
          k8s_username
        }
      },
      {
        $lookup: {
          from: 'namespace',
          localField: 'namespaceId',
          foreignField: 'uid',
          as: 'namespace'
        }
      },
      {
        $unwind: '$namespace'
      }
    ])
    .toArray();
  return result;
}
export async function queryMessage({
  userId,
  k8s_username
}: {
  userId: string;
  k8s_username: string;
}) {
  const collection = await connectToUTN();
  const result = await collection
    .aggregate<
      {
        namespace: Namespace;
        manager: User;
      } & TUserToNamespace
    >([
      {
        $match: {
          userId,
          k8s_username,
          managerId: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'namespace',
          localField: 'namespaceId',
          foreignField: 'uid',
          as: 'namespace'
        }
      },
      {
        $unwind: '$namespace'
      },
      {
        $lookup: {
          from: 'user',
          localField: 'managerId',
          foreignField: 'uid',
          as: 'manager'
        }
      },
      {
        $unwind: '$manager'
      }
    ])
    .toArray();
  return result;
}
export async function queryUsersByNamespace({ namespaceId }: { namespaceId: string }) {
  const collection = await connectToUTN();
  const result = await collection
    .aggregate<TUserToNamespace & { user: User; namespace: Namespace }>([
      {
        $match: {
          namespaceId
        }
      },
      {
        $lookup: {
          from: 'user',
          localField: 'userId',
          foreignField: 'uid',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'namespace',
          localField: 'namespaceId',
          foreignField: 'uid',
          as: 'namespace'
        }
      },
      {
        $unwind: '$namespace'
      }
    ])
    .toArray();
  return result;
}
export async function queryUTN(filterData: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
}) {
  const collection = await connectToUTN();
  const result = await collection.findOne(filterData);
  return result;
}
export async function deleteUTN(filterData: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
}) {
  const collection = await connectToUTN();
  const result = await collection.findOneAndDelete(filterData);
  return result.value;
}

export const changeOwnerBinding = async ({
  userId,
  k8s_username,
  namespaceId,
  tUserId,
  tK8sUsername
}: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
  tUserId: string;
  tK8sUsername: string;
}) => {
  const client = await connectToDatabase();
  const session = client.startSession({});
  let results: [TUserToNamespace, TUserToNamespace] | null = null;
  try {
    await session.withTransaction(
      async (session) => {
        const res1 = await updateUTN({
          userId,
          k8s_username,
          namespaceId,
          role: UserRole.Developer,
          session
        });
        if (res1 === null) throw Error();
        const res2 = await updateUTN({
          userId: tUserId,
          k8s_username: tK8sUsername,
          namespaceId,
          role: UserRole.Owner,
          session
        });
        if (res2 === null) throw Error();
        results = [res1, res2];
      },
      {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
      }
    );
  } finally {
    await session.endSession();
    return results;
  }
};
