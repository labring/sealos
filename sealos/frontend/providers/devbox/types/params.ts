// types/params.ts
export interface TemplateSearchParams {
  category?: string;
  search?: string;
  callback?: string;
}

// 定义回调时可能传递的参数
export interface TemplateCallbackParams {
  templateId: string;
  [key: string]: string; // 其他可能的参数
}
