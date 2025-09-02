import { GET, POST } from '@/services/request';
import { DatasourceForm, DatasourceListResp, SyncDatasourceResponse } from '@/constants/chat2db';

export function syncDatasourceFirst(data: Omit<DatasourceForm, 'id'>, userKey: string) {
  return POST<SyncDatasourceResponse>(
    '/api/proxy/sync_data_source_a',
    {
      ...data,
      userKey
    },
    {
      headers: {
        'Time-Zone': 'Asia/Shanghai',
        'Content-Type': 'application/json'
      }
    }
  );
}

export function syncDatasource(data: DatasourceForm, userKey: string) {
  return POST<SyncDatasourceResponse>(
    `/api/proxy/sync_data_source_a`,
    {
      ...data,
      userKey
    },
    {
      headers: {
        'Time-Zone': 'Asia/Shanghai',
        'Content-Type': 'application/json'
      }
    }
  );
}

export function getDatasourceList() {
  return GET<DatasourceListResp>('/api/open/enterprise/get_datasource_list_a');
}
