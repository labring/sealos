/**
 * Chat2DB – SQL 执行SQL查询
 */
import { POST } from '@/services/request';
import { ExecuteSqlPayload, ExecuteSqlResp } from '@/constants/chat2db';

/**
 * 执行 SQL / DDL / DML
 * @returns Promise<SqlResult[]>
 */
export function executeSql(data: ExecuteSqlPayload) {
  return POST<ExecuteSqlResp>('/api/open/enterprise/query_a', {
    ...data,
    datasourceType: data.datasourceType ?? 'DATA_SOURCE'
  });
}
