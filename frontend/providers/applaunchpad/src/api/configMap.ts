import { GET, POST, DELETE } from '@/services/request';
//创建配置
export const createConfigMap = () => GET<string>('/api/createConfigMap');
//更新配置
export const updateConfigMap = (params:any) => POST<string>('/api/updateConfigMap',params);

//同步配置
export const syncConfigMap = () => GET<string>('/api/syncConfigMap');