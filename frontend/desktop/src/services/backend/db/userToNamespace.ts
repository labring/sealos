import { InvitedStatus, Namespace, UserRole } from '@/types/team';
import { connectToDatabase } from './mongodb';
import { User } from '@/types/user';
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
  deleteTime?: Date;
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
  ...data
}: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
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
