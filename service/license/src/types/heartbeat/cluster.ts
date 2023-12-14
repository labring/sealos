export type ClusterHeartbeatPayload = {
  clusterID: string;
  clusterResource: clusterResource;
};

export type clusterResource = {
  node: number;
  cpu: number;
  memory: number;
};

export type ClusterHeartbeatRecord = {
  clusterID: string;
  clusterResource: clusterResource;
  createdAt: Date;
  updatedAt: Date;
};
