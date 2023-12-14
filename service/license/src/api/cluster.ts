import { ActiveClusterParams } from '@/pages/api/cluster/activeCluster';
import { DELETE, GET, POST } from '@/services/request';
import { ClusterResult, CreateClusterParams } from '@/types';

export const createCluster = (payload: CreateClusterParams) => POST('/api/cluster/create', payload);

export const getClusterList = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: ClusterResult[] }>('/api/cluster/getClusterList', {
    page,
    pageSize
  });

export const findClusterById = (payload: { clusterId: string }) =>
  GET<ClusterResult>('/api/cluster/findById', payload);

export const updateClusterName = (payload: { clusterId: string; displayName: string }) =>
  POST<ClusterResult>('/api/cluster/updateName', payload);

export const deleteClusterById = (payload: { clusterId: string }) =>
  DELETE<ClusterResult>('/api/cluster/delete', payload);

export const isKubeSystemIDBound = (id: string) =>
  GET<{ isBound: boolean }>('/api/cluster/isBound', { kubeSystemID: id });

export const activeClusterBySystemId = (payload: ActiveClusterParams) =>
  POST<ClusterResult>('/api/cluster/activeCluster', payload);

export const findClusterBySystemId = (payload: { systemId: string }) =>
  GET<ClusterResult>('/api/cluster/findBySystemId', payload);
