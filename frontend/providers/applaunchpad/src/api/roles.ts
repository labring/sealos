import { GET, POST, DELETE } from '@/services/request';

//获取角色列表
export const getRoles = (params:any) => GET<any>(`/api/node/roles`);


//获取菜单列表
export const getAllMenus = (params:any) => GET<any>(`/api/node/getAllMenus`);
