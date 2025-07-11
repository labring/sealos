/**
 * Chat2DB – 数据源管理接口封装
 */

import { GET, POST } from '@/services/request';
import { DatasourceForm, DatasourceItem, DatasourceListResp } from '@/constants/chat2db';

/* ---------- 1. 创建数据源 ---------- */
export function createDatasource(data: Omit<DatasourceForm, 'id'>) {
  return POST<number>('/api/open/enterprise/create_data_source_a', data);
}

/* ---------- 2. 更新数据源 ---------- */
export function updateDatasource(data: DatasourceForm) {
  return POST<number>('/api/open/enterprise/update_data_source_a', data);
}

/* ---------- 3. 删除数据源 ---------- */
export function deleteDatasource(id: number) {
  return POST<void>('/api/open/enterprise/delete_data_source_a', undefined, {
    params: { id }
  });
}

/* ---------- 4. 获取数据源列表 ---------- */
export function getDatasourceList() {
  return GET<DatasourceListResp>('/api/open/enterprise/get_datasource_list_a');
}
