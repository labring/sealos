export const VLOGS_CONFIG = {
  BASE_URL: process.env.VLOGS_BASE_URL || '',

  ENDPOINTS: {
    QUERY_LOGS: '/queryLogsByPod',
    QUERY_PODS: '/queryPodList'
  },

  get QUERY_LOGS_URL() {
    return `${this.BASE_URL}${this.ENDPOINTS.QUERY_LOGS}`;
  },

  get QUERY_PODS_URL() {
    return `${this.BASE_URL}${this.ENDPOINTS.QUERY_PODS}`;
  }
};
