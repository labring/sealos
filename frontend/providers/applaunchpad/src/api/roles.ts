import { GET, POST,PUT, DELETE } from '@/services/request';

//获取角色列表
export const getRoles = (params:any) => GET<any>(`/api/node/roles`);
export const addRoles = (params:any) => POST<any>(`/api/node/addRoles`,params);
export const updateRoles = (id:any,params:any) => PUT<any>(`/api/node/updateRoles`,{...params,id});


//获取菜单列表
export const getAllMenus = (params:any) => GET<any>(`/api/node/getAllMenus`);
