import * as k8s from '@kubernetes/client-node';
import { AxiosInstance } from 'axios';
import { PrismaClient } from 'prisma/region/generated/client';
import { PrismaClient as GlobalPrismaClient } from 'prisma/global/generated/client';

export const cleanK8s = async (kc: k8s.KubeConfig, prisma: PrismaClient) => {
  kc.loadFromDefault();
  const userCrs = await prisma.userCr.findMany();
  await Promise.all(
    userCrs.map(async (user) => {
      try {
        await kc
          .makeApiClient(k8s.CustomObjectsApi)
          .deleteClusterCustomObject('user.sealos.io', 'v1', 'users', user.crName);
      } catch {}
    })
  );
  const namespaces = await prisma.workspace.findMany();
  await Promise.all(
    namespaces.map(async (ns) => {
      try {
        await kc.makeApiClient(k8s.CoreV1Api).deleteNamespace(ns.id);
      } catch {}
    })
  );
};
export const cleanDb = async (prisma: PrismaClient) => {
  console.log('cleanDb');
  await prisma.userWorkspace.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.userCr.deleteMany();
};
export const cleanGlobalDb = async (prisma: GlobalPrismaClient) => {
  console.log('cleanDb');
  await prisma.oauthProvider.deleteMany();
  await prisma.user.deleteMany();
};

export const _setAuth = (request: AxiosInstance) => (token?: string) => {
  request.interceptors.request.clear();
  token &&
    request.interceptors.request.use((config) => {
      config.headers.Authorization = token;
      return config;
    });
};
