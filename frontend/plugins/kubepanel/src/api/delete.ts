import { Resources } from '@/constants/kube-object';
import { ApiResp } from '@/services/kubernet';
import { DELETE } from '@/services/request';

export const deleteResource = (name: string, resource: Resources) =>
  DELETE<ApiResp>(`/api/delete?resource=${resource}&name=${name}`);
