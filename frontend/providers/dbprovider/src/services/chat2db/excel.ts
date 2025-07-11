import { POST, GET } from '@/services/request';
import { UploadExcelResp, ExcelProgressResp } from '@/constants/chat2db';

/* ---------- 1. 上传 Excel ---------- */
export function uploadExcel(file: File) {
  const form = new FormData();
  form.append('file', file);

  return POST<UploadExcelResp>('/api/open/enterprise/upload_chat_excel_a', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function updateExcel(file: File) {
  const form = new FormData();
  form.append('file', file);

  return POST<UploadExcelResp>('/api/open/enterprise/update_chat_excel_a', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/* ---------- 3. 删除 Excel 文件（按数据源 ID） ---------- */
export function deleteExcel(dataSourceId: number) {
  return POST<void>(
    '/api/open/enterprise/del_excel_a',
    { dataSourceId },
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/* ---------- 4. 查询 Excel 处理进度 ---------- */
export function getExcelImportStatus(id: number) {
  return GET<ExcelProgressResp>('/api/open/enterprise/get_chat_excel_message_a', { id });
}
