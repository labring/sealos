export type WorkspaceQuotaItem = {
  type: 'cpu' | 'memory' | 'storage' | 'gpu' | 'traffic' | 'nodeport';
  used: number;
  limit: number;
};
