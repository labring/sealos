import { _passwordLoginRequest } from '@/api/auth';
import {
  _abdicateRequest,
  _createRequest,
  _deleteTeamRequest,
  _inviteMemberRequest,
  _modifyRoleRequest,
  _nsListRequest,
  _reciveMessageRequest,
  _removeMemberRequest,
  _teamDetailsRequest,
  _verifyInviteRequest
} from '@/api/namespace';
import { Namespace } from '@/types/team';
import { Session } from 'sealos-desktop-sdk/*';
import * as k8s from '@kubernetes/client-node';
import { Db } from 'mongodb';
import { User } from '@/types/user';
import { AxiosInstance } from 'axios';

export const cleanK8s = async (kc: k8s.KubeConfig, db: Db) => {
  kc.loadFromDefault();
  const userCollection = db.collection<User>('user');
  const users = await userCollection.find({}).toArray();
  Promise.all(
    users.map(async (user) => {
      try {
        await kc
          .makeApiClient(k8s.CustomObjectsApi)
          .deleteClusterCustomObject('user.sealos.io', 'v1', 'users', user.k8s_users![0].name);
      } catch {}
    })
  );
  const nsCollection = db.collection<Namespace>('namespace');
  const namespaces = await nsCollection.find({}).toArray();
  Promise.all(
    namespaces.map(async (ns) => {
      try {
        await kc.makeApiClient(k8s.CoreV1Api).deleteNamespace(ns.id);
      } catch {}
    })
  );
};
export const cleanDb = async (db: Db) => {
  const collections = await db.collections();
  Promise.all(
    collections.map(async (collection) => {
      await collection.deleteMany({});
    })
  );
};

export const _setAuth = (request: AxiosInstance) => (session: Partial<Session>) => {
  request.interceptors.request.clear();
  session?.token &&
    request.interceptors.request.use((config) => {
      config.headers.Authorization = session.token;
      return config;
    });
};
