import { Resources } from '@/constants/kube-object';
import { POST } from '@/services/request';

interface Response {
  code: number;
  data: {
    message: string;
  };
}

export const createResource = (data: string, resource: Resources) =>
  POST<Response>(`/api/create?resource=${resource}`, {
    data
  });
