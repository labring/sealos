import { snakeCase } from 'lodash';

const statusBackgroundColorMapping = {
  running: 'color-ok',
  pending: 'color-warning',
  evicted: 'color-error',
  waiting: 'color-warning',
  succeeded: 'color-success',
  failed: 'color-error',
  terminated: 'color-terminated',
  terminating: 'color-terminated',
  completed: 'color-success',
  crash_loop_back_off: 'color-error',
  error: 'color-error',
  container_creating: 'color-info'
} as { [key: string]: string };

export const getStatusColor = (status: string): string | undefined => {
  return statusBackgroundColorMapping[snakeCase(status)];
};
