import type { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@/types/user';
import { Namespace } from '@/types/team';
import { MongoClient, WithId } from 'mongodb';
import { TUserToNamespace } from '@/services/backend/db/userToNamespace';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import * as k8s from '@kubernetes/client-node';

const mongodb = new MongoClient(process.env.MONGODB_URI!);
const client = mongodb.db();

async function pullUserData() {
  const userCollection = client.collection<User>('user');
  const namespaceCollection = client.collection<Namespace>('namespace');
  const uToNCollection = client.collection<TUserToNamespace>('userToNs');
  const accountsCRList = await K8sApiDefault()
    .makeApiClient(k8s.CustomObjectsApi)
    .listNamespacedCustomObject('account.sealos.io', 'v1', 'sealos-system', 'accounts');
  console.log('get account success');
  const accountsMap = new Map<string, [number, number | undefined]>(
    // @ts-ignore
    accountsCRList.body.items.map((item) => [
      item.metadata.name,
      [item.status.balance, item.status.deductionBalance]
    ])
  );
  const providerList = ['github', 'phone', 'wechat'];
  const _user: [string, string][] = [];
  const userUid: string[] = [];
  const workspaceId: string[] = [];
  for await (const provider of providerList) {
    // find
    const data = await userCollection
      .aggregate<WithId<{ docs: User }>>([
        {
          $match: {
            k8s_users: {
              $exists: true
            },
            [provider]: {
              $exists: true,
              $nin: [null, '', 'undefined', 'null']
            }
          }
        },
        {
          $group: {
            _id: '$' + provider,
            docs: {
              $push: '$$ROOT'
            }
          }
        },
        {
          $match: {
            $and: [
              {
                $expr: {
                  $gt: [
                    {
                      $size: '$docs'
                    },
                    1
                  ]
                }
              }
            ]
          }
        },
        {
          $unwind: '$docs'
        }
      ])
      .toArray();
    // validate
    data.map((doc) => {
      // @ts-ignore
      const crName = doc.docs.k8s_users[0].name;
      let balance = accountsMap.get(crName);
      if (!balance || (balance && balance[0] === 5000000 && !balance[1])) {
        _user.push([doc.docs.uid, 'ns-' + crName]);
      }
    });
  }
  const utnRes = await uToNCollection
    .find({
      $or: [
        {
          userId: {
            $in: _user.map((u) => u[0])
          }
        },
        {
          managerId: {
            $in: _user.map((u) => u[0])
          }
        }
      ]
    })
    .toArray();
  const utnSet = new Set(utnRes.map((utn) => utn.userId));
  _user.forEach((u) => {
    // if(!utnSet.has(u[0])) {
    userUid.push(u[0]);
    workspaceId.push(u[1]);
    // }
  });
  console.log('this user will be deleted: ', userUid);
  console.log(
    'this user will be remain: ',
    utnRes.map((u) => u.k8s_username)
  );
  console.log('this workspace will be deleted: ', workspaceId);

  console.log(userUid.length, workspaceId.length, _user.length, utnRes.length);
  await Promise.all([
    userCollection.deleteMany({
      uid: {
        $in: userUid
      }
    }),
    namespaceCollection.deleteMany({
      id: {
        $in: workspaceId
      }
    }),
    uToNCollection.deleteMany({
      userId: userUid
    })
  ]);
  console.log('ok');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (process.env.migrate !== 'true') return;
    console.log('pullUser');
    await pullUserData();
    console.log('ok');
    return res.json('ok');
  } catch (error) {
    console.log(error);
    return res.json('error');
  }
}
