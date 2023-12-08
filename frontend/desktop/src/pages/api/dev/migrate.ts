import { User } from '@/types/user';
import { MongoClient, WithId } from 'mongodb';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { TUserToNamespace } from '@/services/backend/db/userToNamespace';
import { InvitedStatus, Namespace, NSType, UserRole } from '@/types/team';
import { ProviderType, PrismaPromise } from 'prisma/global/generated/client';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { nanoid } from 'nanoid';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isNumber } from 'lodash';
import { v4 } from 'uuid';

const LIMIT = 10;

async function asyncPool<T>(
  poolLimit: number,
  array: T[],
  iteratorFn: (item: T) => Promise<any>
): Promise<any[]> {
  const ret: Promise<any>[] = [];
  const executing: Promise<any>[] = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (poolLimit <= array.length) {
      // @ts-ignore
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return await Promise.all(ret);
}

const getProviderType = (user: User) => {
  const ret: {
    type: ProviderType;
    id: string;
    password?: string;
  }[] = [];
  if (user.github)
    ret.push({
      type: ProviderType.GITHUB,
      id: user.github
    });
  if (user.phone)
    ret.push({
      type: ProviderType.PHONE,
      id: user.phone
    });
  if (user.google)
    ret.push({
      type: ProviderType.GOOGLE,
      id: user.google
    });
  if (user.password && user.password_user)
    ret.push({
      type: ProviderType.PASSWORD,
      id: user.password_user,
      password: user.password
    });
  if (user.wechat)
    ret.push({
      type: ProviderType.WECHAT,
      id: user.wechat
    });
  return ret;
};
const afterAllPromises: (() => Promise<unknown>)[] = [];
const afterAllPromises2: (() => Promise<unknown>)[] = [];
const mongodb = new MongoClient(process.env.MONGODB_URI!);
const client = mongodb.db();
const QLimit = 100;

async function pullUserData() {
  const userCollection = client.collection<User>('user');
  const namespaceCollection = client.collection<Namespace>('namespace');

  const uToNCollection = client.collection<TUserToNamespace>('userToNs');

  const errorCollection = client.collection<{ user: any; reason: string }>('erroruser');
  const cursor = userCollection.find(
    { k8s_users: { $exists: true } },
    { sort: { created_time: 1 } }
  );
  const userQ: WithId<User>[] = [];
  const promises: (() => Promise<unknown>)[] = [];
  // for UserCr
  const promises2: (() => Promise<unknown>)[] = [];
  const promises3: (() => Promise<unknown>)[] = [];
  afterAllPromises.length = 0;
  const fn = (user: WithId<User> | null | undefined) => {
    if ((!user && userQ.length > 0) || userQ.length > QLimit) {
      const rawData = userQ.map((u) => {
        const providerResArr = getProviderType(u).map((providerRes) => ({
          providerType: providerRes.type,
          providerId: isNumber(providerRes.id) ? providerRes.id + '' : providerRes.id,
          password: providerRes.password
          // exist: false
        }));
        const nickname = (isNumber(u.name) ? u.name + '' : u.name) || '';
        return {
          nickname,
          providerResArr,
          user: u
        };
      });
      promises.push(async () => {
        const providerInsertData: {
          providerType: ProviderType;
          providerId: string;
          password?: string;
          userUid: string;
        }[] = [];
        const userInsertData: {
          name: string;
          id: string;
          avatarUri: string;
          nickname: string;
          uid: string;
        }[] = [];
        const userCrInsertData: {
          uid: string;
          crName: string;
          userUid: string;
          createdAt: Date;
        }[] = [];
        const userMayInsert = [];
        banchloop: for await (const rawD of rawData) {
          let userUid = '';
          let providerResArr = rawD.providerResArr;
          const curProviderList: {
            providerType: ProviderType;
            providerId: string;
            password?: string;
          }[] = [];
          providersloop: for (let i = 0; i < providerResArr.length; i++) {
            const providerRes = providerResArr[i];
            const curSearchResult = await globalPrisma.oauthProvider.findUnique({
              where: {
                providerId_providerType: {
                  providerId: providerRes.providerId,
                  providerType: providerRes.providerType
                }
              }
            });
            if (curSearchResult) {
              userUid = curSearchResult.userUid;
            } else {
              curProviderList.push({
                providerId: providerRes.providerId,
                providerType: providerRes.providerType,
                password: providerRes.password
              });
            }
          }
          const userId = nanoid(10);
          // global

          if (!userUid) {
            userUid = v4();
          } else {
            // when the oauthProvider  is being inserted into table inserted but user is not being inserted to table
            userMayInsert.push(userUid);
          }
          userInsertData.push({
            name: userId,
            id: userId,
            avatarUri: rawD.user.avatar_url || '',
            nickname: rawD.nickname,
            uid: userUid
          });
          providerInsertData.push(
            ...curProviderList.map(({ providerType, providerId, password }) => ({
              providerType,
              providerId,
              password,
              userUid
            }))
          );
          const crName = rawD.user.k8s_users?.[0].name;
          //@ts-ignore
          // const namespace = rawD.user.namespaces?.[0] as { id: string, type: NSType }
          if (crName) {
            userCrInsertData.push({
              uid: rawD.user.uid,
              crName,
              userUid,
              createdAt: new Date(rawD.user.created_time)
            });
          } else
            promises2.push(() =>
              errorCollection.insertOne({
                user,
                reason: 'insert oooooold user'
              })
            );
        }
        // make sure provider sucessfully!!!

        console.log('provider', providerInsertData);
        if (providerInsertData.length > 0)
          await globalPrisma.oauthProvider
            .createMany({
              data: providerInsertData,
              skipDuplicates: true
            })
            .then((res) => {
              console.log('providers insert status', res);
            })
            .catch(async (e) => {
              await errorCollection.insertOne({
                user: providerInsertData,
                reason: e as any
              });
              return Promise.reject();
            });
        // must be immedaicated
        const userMayInsertSet = new Set(
          (
            await globalPrisma.user.findMany({
              where: {
                uid: {
                  in: userMayInsert
                }
              }
            })
          ).map((res) => res.uid)
        );
        const finalUserInsertData = userInsertData.filter((u) => !userMayInsertSet.has(u.uid));
        console.log('user', finalUserInsertData);
        if (finalUserInsertData.length > 0)
          await globalPrisma.user
            .createMany({
              data: finalUserInsertData,
              skipDuplicates: true
            })
            .then((res) => {
              console.log('user insert status', res);
            })
            .catch(async (e) => {
              console.log(userInsertData);
              console.log(e);
              await errorCollection.insertOne({
                user,
                reason: e as any
              });
              return Promise.reject();
            });

        if (userCrInsertData.length > 0)
          promises2.push(async () => {
            console.log('userCr', userCrInsertData);
            await prisma.userCr
              .createMany({
                data: userCrInsertData,
                skipDuplicates: true
              })
              .then((res) => {
                console.log('userCr insert status', res);
              })
              .catch(async (e) => {
                await errorCollection.insertOne({
                  user: userCrInsertData,
                  reason: e as any
                });
                return Promise.reject();
              });
          });
        const getNsid = (user: User): string => {
          if (user.k8s_users) {
            return 'ns-' + user.k8s_users[0].name;
          } else {
            //@ts-ignore
            return user.namespaces[0].id;
          }
        };

        afterAllPromises.push(async () => {
          // handle old phase
          const nsNeedInsertReady = rawData.filter((d) => !!getNsid(d.user));
          const nsNeedInsertKey = nsNeedInsertReady.map((d) => {
            return getNsid(d.user);
          });
          const nsNoNeedInsertSetInMongo = new Set(
            (
              await namespaceCollection
                .find({
                  id: {
                    $in: nsNeedInsertKey
                  }
                })
                .toArray()
            ).map((d) => d.id)
          );

          const nsNoNeedInsertSetInPrisma = new Map(
            (
              await prisma.workspace.findMany({
                where: {
                  id: {
                    in: nsNeedInsertKey
                  }
                }
              })
            ).map((d) => [d.id, d.uid])
          );
          const mongoNotIncludeData = nsNeedInsertReady
            // @ts-ignore
            .filter((d) => {
              // @ts-ignore
              const id = getNsid(d.user);
              // for the relation
              return !nsNoNeedInsertSetInMongo.has(id);
            })
            .map((d) => {
              const nsid = getNsid(d.user);
              const nsUid = nsNoNeedInsertSetInPrisma.get(nsid);
              return {
                nsuid: !!nsUid ? nsUid : v4(),
                // @ts-ignore
                nsid,
                user: d.user,
                nsExist: !!nsUid
              };
            });

          const nsInsertData = mongoNotIncludeData
            .filter((d) => !d.nsExist)
            .map((d) => ({
              uid: d.nsuid,
              createdAt: d.user.created_time,
              displayName: 'private team',
              id: d.nsid
            }));
          console.log(nsInsertData);
          if (nsInsertData.length > 0)
            await prisma.workspace
              .createMany({
                data: nsInsertData,
                skipDuplicates: true
              })
              .then((res) => {
                console.log('ns insert status', res);
              })
              .catch((e) => {
                console.log(e);
                return Promise.reject();
              });
          // private ns is 1-1 get relation set by workspaceUid
          const relationNoNeedInsertSetInPrisma = new Set(
            (
              await prisma.userWorkspace.findMany({
                where: {
                  workspaceUid: {
                    in: mongoNotIncludeData.map((n) => n.nsuid)
                  }
                }
              })
            ).map((d) => d.workspaceUid)
          );
          const relationInsertData = mongoNotIncludeData
            .filter((d) => !relationNoNeedInsertSetInPrisma.has(d.nsuid))
            .map((d) => {
              return {
                joinAt: d.user.created_time,
                isPrivate: true,
                createdAt: d.user.created_time,
                status: JoinStatus.IN_WORKSPACE,
                workspaceUid: d.nsuid,
                userCrUid: d.user.uid,
                role: Role.OWNER
              };
            });
          console.log(relationInsertData);
          if (relationInsertData.length > 0) {
            await prisma.userWorkspace
              .createMany({
                data: relationInsertData,
                skipDuplicates: true
              })
              .then((res) => {
                console.log('relation insert status', res);
              })
              .catch((e) => {
                console.log(e);
                return Promise.reject();
              });
          }
        });
      });
      userQ.length = 0;
    }
  };
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    if (user) userQ.push(user);
    fn(user);
  }
  fn(null);
  await asyncPool(LIMIT, promises, (fn) => fn());
  await asyncPool(LIMIT, promises2, (fn) => fn());
  await asyncPool(LIMIT, promises3, (fn) => fn());
}

async function pullWorkspaceData() {
  const namespaceCollection = client.collection<Namespace>('namespace');
  const nsCursor = namespaceCollection.find();
  const errorCollection = client.collection<{ namespace: any; reason: string }>('errorNamespace');
  const promises: (() => Promise<unknown>)[] = [];
  const nsQ: WithId<Namespace>[] = [];
  const fn = (ns: WithId<Namespace> | undefined | null) => {
    if ((!ns && nsQ.length > 0) || nsQ.length > QLimit) {
      const data = nsQ.map((ns) => ({
        createdAt: ns.createTime,
        displayName: ns.teamName,
        id: ns.id,
        uid: ns.uid
      }));
      promises.push(async () => {
        // console.log(data.map(n => n.id));
        // console.log(data)
        if (data.length > 0)
          await prisma.workspace
            .createMany({
              data,
              skipDuplicates: true
            })
            .then((res) => {
              console.log('insert ns status', res);
            })
            .catch(async (rej) => {
              const list = nsQ.map((ns) => ns.id);
              console.log(list, rej);
              afterAllPromises.push(() =>
                errorCollection.insertOne({ namespace: list, reason: rej })
              );
              return Promise.reject();
            });
      });
      nsQ.length = 0;
    }
  };
  while (await nsCursor.hasNext()) {
    const ns = await nsCursor.next();
    if (ns) nsQ.push(ns);
  }
  fn(null);
  await asyncPool(LIMIT, promises, (fn) => fn());
}

async function pullutnData() {
  const namespaceCollection = client.collection<Namespace>('namespace');
  const uToNCollection = client.collection<TUserToNamespace>('userToNs');
  const errorCollection = client.collection<{ utn: any; reason: string }>('errorUTN');
  const itoj = {
    [InvitedStatus.Accepted]: JoinStatus.IN_WORKSPACE,
    [InvitedStatus.Inviting]: JoinStatus.INVITED,
    [InvitedStatus.Rejected]: JoinStatus.NOT_IN_WORKSPACE
  };
  const utou = {
    [UserRole.Manager]: Role.MANAGER,
    [UserRole.Owner]: Role.OWNER,
    [UserRole.Developer]: Role.DEVELOPER
  };
  const UtoNCursor = uToNCollection.find();
  const promises: (() => Promise<unknown>)[] = [];
  const utnQ: WithId<TUserToNamespace>[] = [];
  const fn = (uTon: WithId<TUserToNamespace> | null | undefined) => {
    if (uTon) utnQ.push(uTon);
    const data = utnQ.map((uTon) => ({
      joinAt: uTon.joinTime,
      updatedAt: uTon.updateTime,
      isPrivate: true,
      // (await namespaceCollection.findOne({uid: uTon.namespaceId}))?.nstype ===
      // NSType.Private,
      createdAt: uTon.createTime,
      status: itoj[uTon.status],
      workspaceUid: uTon.namespaceId,
      userCrUid: uTon.userId,
      role: utou[uTon.role]
    }));
    if ((!uTon && utnQ.length > 0) || utnQ.length > QLimit) {
      promises.push(async () => {
        const teamNsSet = new Set(
          (
            await namespaceCollection
              .find({
                uid: {
                  $in: data.map((d) => d.workspaceUid)
                },
                nstype: NSType.Team
              })
              .toArray()
          ).map((d) => d.uid)
        );
        data.forEach((d) => (d.isPrivate = !teamNsSet.has(d.workspaceUid)));
        // console.log(data)
        if (data.length > 0)
          await prisma.userWorkspace
            .createMany({
              data,
              skipDuplicates: true
            })
            .then((res) => {
              console.log('insert utn status', res);
            })
            .catch((rej) => {
              console.log(rej);
              afterAllPromises.push(() =>
                errorCollection.insertOne({
                  utn: data.map((d) => [d.userCrUid, d.workspaceUid]),
                  reason: rej
                })
              );
              return Promise.reject();
            });
      });
      utnQ.length = 0;
    }
  };
  while (await UtoNCursor.hasNext()) {
    const doc = await UtoNCursor.next();
    fn(doc);
  }
  fn(null);
  await asyncPool(LIMIT, promises, (fn) => fn());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (process.env.migrate !== 'true') return;
    console.log('pullUser');
    await pullUserData();
    console.log('pullWorkspace');
    await pullWorkspaceData();
    console.log('pullRelation');
    await pullutnData();
    console.log('pullAfterAll');
    await asyncPool(LIMIT, afterAllPromises, (fn) => fn());
    await asyncPool(LIMIT, afterAllPromises2, (fn) => fn());
    console.log('ok');
    return res.json('ok');
  } catch (error) {
    console.log(error);
    return res.json('error');
  }
}
