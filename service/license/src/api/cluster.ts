import { GET, POST } from '@/services/request';
import { CreateClusterParams, ClusterDB, ClusterType, ClusterResult } from '@/types';

export const createCluster = (payload: { type: ClusterType }) =>
  POST('/api/cluster/create', payload);

export const createClusterAndLicense = (payload: CreateClusterParams) =>
  POST('/api/cluster/clusterAndLicense', payload);

export const getClusterRecord = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: ClusterDB[] }>('/api/cluster/getRecord', {
    page,
    pageSize
  });

export const findClusterById = (payload: { clusterId: string }) =>
  GET<ClusterResult>('/api/cluster/findById', payload);
