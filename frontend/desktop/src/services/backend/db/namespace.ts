import { connectToDatabase } from './mongodb';
async function connectToNSCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<Namespace>('namespace');
  await collection.createIndex({ id: 1 }, { unique: true });
  return collection;
}
export enum UserRole {
  Default,
  Owner,
  Manager,
  Developer
}
// 可能是私人的ns, 也可能是团队的ns
export enum NSType {
  Team,
  Private
}
export type NSUser = {
  username: string;
  role: UserRole;
};
export type Namespace = {
  // ns 的名字
  id: string;
  // 展示到前端的名字
  teamName?: string;
  // 容纳的所有用户
  users: NSUser[];
  nstype: NSType;
};

export async function getUsers({ namespace: id }: { namespace: string }) {
  const collection = await connectToNSCollection();
  let result = await collection.findOne({ id });
  const users = result?.users || [];
  return users;
}
export async function addUser({ namespace, user }: { namespace: string; user: NSUser }) {
  const collection = await connectToNSCollection();
  const result = await collection.updateOne(
    {
      id: namespace
    },
    {
      $push: {
        users: user
      }
    }
  );
  return result.acknowledged;
}
export async function modifyRole({ namespace, user }: { namespace: string; user: NSUser }) {
  const collection = await connectToNSCollection();
  const result = await collection.findOneAndUpdate(
    {
      id: namespace,
      'users.username': user.username
    },
    {
      $set: {
        'users.$.role': user.role
      }
    }
  );
  return result.acknowledged;
}
export async function removeUser({ namespace, username }: { namespace: string; username: string }) {
  const collection = await connectToNSCollection();
  collection.findOneAndUpdate(
    {
      id: namespace
    },
    {
      $pull: {
        users: {
          username
        }
      }
    }
  );
}
export async function createNamespace({
  namespace: id,
  username,
  nstype
}: {
  namespace: string;
  username: string;
  nstype: NSType;
}) {
  const collection = await connectToNSCollection();
  const user = { username, role: UserRole.Default };
  const ns: Namespace = {
    id,
    users: [],
    nstype
  };
  if (nstype === NSType.Team) {
    user.role = UserRole.Owner;
  } else if (nstype === NSType.Private) {
    user.role = UserRole.Owner;
  } else {
    return false;
  }
  ns.users.push(user);
  const result = await collection.insertOne(ns);
  return result.acknowledged;
}
export async function removeNamespace({ namespace: id }: { namespace: string }) {
  const collection = await connectToNSCollection();
  const result = await collection.deleteOne({
    id
  });
  return result.acknowledged;
}

export async function checkIsOwner({
  namespace: id,
  username
}: {
  namespace: string;
  username: string;
}) {
  const collection = await connectToNSCollection();
  const result = await collection.findOne({
    id,
    users: {
      $in: [
        {
          username,
          role: UserRole.Owner
        }
      ]
    }
  });
  return !!result;
}
