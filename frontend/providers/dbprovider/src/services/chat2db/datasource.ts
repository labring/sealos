import { GET, POST } from '@/services/request';
import {
  DatasourceForm,
  DatasourceItem,
  DatasourceListResp,
  DatasourceDelete,
  CreateApiResponse,
  SyncDatasourceResponse
} from '@/constants/chat2db';

export function createDatasource(
  data: Omit<DatasourceForm, 'id'>,
  apiKey: string,
  userKey: string
) {
  return POST<any>('/api/proxy/create_data_source_a', data, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      auth_user: userKey,
      'Time-Zone': 'Asia/Shanghai',
      'Content-Type': 'application/json'
    }
  });
}

export function updateDatasource(data: DatasourceForm, apiKey: string) {
  return POST<number>('/api/proxy/update_data_source_a', data, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Time-Zone': 'Asia/Shanghai',
      'Content-Type': 'application/json'
    }
  });
}

export function deleteDatasource(id: number, apiKey: string) {
  return POST<void>(`/api/proxy/delete_data_source_a?id=${id}`, undefined, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Time-Zone': 'Asia/Shanghai',
      'Content-Type': 'application/json'
    }
  });
}

// 首次调用时不需要 id 参数，返回数据源ID
export function syncDatasourceFirst(
  data: Omit<DatasourceForm, 'id'>,
  apiKey: string,
  userKey: string
) {
  return POST<SyncDatasourceResponse>('/api/proxy/sync_data_source_a', data, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      sync_user: userKey,
      'Time-Zone': 'Asia/Shanghai',
      'Content-Type': 'application/json'
    }
  });
}

// 非首次调用时需要 id 参数，不返回数据
export function syncDatasource(data: DatasourceForm, apiKey: string, userKey: string) {
  return POST<SyncDatasourceResponse>(`/api/proxy/sync_data_source_a`, data, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      sync_user: userKey,
      'Time-Zone': 'Asia/Shanghai',
      'Content-Type': 'application/json'
    }
  });
}

export function getDatasourceList() {
  return GET<DatasourceListResp>('/api/open/enterprise/get_datasource_list_a');
}
