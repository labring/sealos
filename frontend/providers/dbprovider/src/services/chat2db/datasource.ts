import { GET, POST } from '@/services/request';
import {
  DatasourceForm,
  DatasourceItem,
  DatasourceListResp,
  DatasourceDelete,
  CreateApiResponse
} from '@/constants/chat2db';

export function createDatasource(
  data: Omit<DatasourceForm, 'id'>,
  apiKey: string,
  userKey: string
) {
  return POST<CreateApiResponse>('/api/proxy/create_data_source_a', data, {
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

export function getDatasourceList() {
  return GET<DatasourceListResp>('/api/open/enterprise/get_datasource_list_a');
}
