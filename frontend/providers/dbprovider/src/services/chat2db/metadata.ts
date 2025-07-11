/**
 * Chat2DB – 表/列元数据标注接口封装
 * 路径：src/services/chat2db/metadata.ts
 */
import { POST } from '@/services/request';
import {
  ColumnAlias,
  TableCommentExt,
  TableCommentType,
  SaveTableCommentPayload
} from '@/constants/chat2db';

/* ---------- 保存 / 更新表&列注释 ---------- */
export function saveTableComment(data: SaveTableCommentPayload) {
  return POST<void>('/api/open/enterprise/save_table_comment_a', data);
}
