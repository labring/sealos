import { GET, POST } from '@/services/request';

export const getFileByName = (fileName: string) =>
  GET<string>('/api/oss/get', { fileName: fileName });
