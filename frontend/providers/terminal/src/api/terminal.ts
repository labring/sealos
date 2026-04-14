import request from '@/service/request';

export function getEnv() {
  return request.get<
    any,
    {
      data: {
        data: {
          CPU_REQUIREMENT: number;
          MEMORY_REQUIREMENT: number;
          TTY_AGENT_BASE_URL?: string;
        };
      };
    }
  >('/api/env');
}
