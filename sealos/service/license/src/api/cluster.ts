import { ActiveClusterParams } from '@/pages/api/cluster/activeCluster';
import { DELETE, GET, POST } from '@/services/request';
import { ClusterDB, CreateClusterParams } from '@/types';

export const createCluster = (payload: CreateClusterParams) =>
  POST<ClusterDB>('/api/cluster/create', payload);

export const getClusterList = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: ClusterDB[] }>('/api/cluster/getClusterList', {
    page,
    pageSize
  });

export const findClusterById = (payload: { clusterId: string }) =>
  GET<ClusterDB>('/api/cluster/findById', payload);

export const updateClusterName = (payload: { clusterId: string; displayName: string }) =>
  POST<ClusterDB>('/api/cluster/updateName', payload);

export const deleteClusterById = (payload: { clusterId: string }) =>
  DELETE<ClusterDB>('/api/cluster/delete', payload);

export const isKubeSystemIDBound = (id: string) =>
  GET<{ isBound: boolean }>('/api/cluster/isBound', { kubeSystemID: id });

export const activeClusterBySystemId = (payload: ActiveClusterParams) =>
  POST<ClusterDB>('/api/cluster/activeCluster', payload);

export const findClusterBySystemId = (payload: { systemId: string }) =>
  GET<ClusterDB>('/api/cluster/findBySystemId', payload);
