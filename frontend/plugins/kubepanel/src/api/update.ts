import { Resources } from '@/constants/kube-object';
import { ApiResp } from '@/services/kubernet';
import { PUT } from '@/services/request';

export const updateResource = (data: string, name: string, resource: Resources) =>
  PUT<ApiResp>(`/api/update?resource=${resource}&name=${name}`, {
    data
  });
