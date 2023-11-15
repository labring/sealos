import { KindMap, Resources } from '@/constants/kube-object';
import { GET } from '@/services/request';

export const getTemplate = (resource: Resources) =>
  GET<string>(`/api/template?name=${KindMap[resource]}`);
