import request from '@/service/request';

export function getEnv() {
  return request.get<
    any,
    {
      data: {
        data: {
          CPU_REQUIREMENT: number;
          MEMORY_REQUIREMENT: number;
        };
      };
    }
  >('/api/env');
}
