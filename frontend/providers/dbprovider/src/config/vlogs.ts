// vlogs API 配置
export const VLOGS_CONFIG = {
  // 例如：'http://your-vlogs-service.com', 'https://vlogs.your-domain.com'
  BASE_URL: process.env.VLOGS_BASE_URL || '', // 真实vlogs服务地址

  // API端点
  ENDPOINTS: {
    QUERY_LOGS: '/queryLogsByPod',
    QUERY_PODS: '/queryPodList'
  },

  // 完整的API地址
  get QUERY_LOGS_URL() {
    return `${this.BASE_URL}${this.ENDPOINTS.QUERY_LOGS}`;
  },

  get QUERY_PODS_URL() {
    return `${this.BASE_URL}${this.ENDPOINTS.QUERY_PODS}`;
  }
};

// 使用示例：
// import { VLOGS_CONFIG } from '@/config/vlogs';
// const response = await fetch(VLOGS_CONFIG.QUERY_LOGS_URL, {...});
