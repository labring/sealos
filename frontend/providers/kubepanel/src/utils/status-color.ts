import type { BadgeProps } from 'antd';
import type { TextProps } from 'antd/es/typography/Text';
import { snakeCase } from 'lodash';

type TextTone = TextProps['type'];
type BadgeTone = BadgeProps['status'];

const statusTextToneMapping: Record<string, TextTone> = {
  running: 'success',
  pending: 'warning',
  evicted: 'danger',
  waiting: 'warning',
  succeeded: 'success',
  failed: 'danger',
  terminated: 'secondary',
  terminating: 'secondary',
  completed: 'success',
  crash_loop_back_off: 'danger',
  error: 'danger',
  container_creating: 'secondary'
};

const statusBadgeToneMapping: Record<string, BadgeTone> = {
  running: 'success',
  pending: 'warning',
  evicted: 'error',
  waiting: 'warning',
  succeeded: 'success',
  failed: 'error',
  terminated: 'default',
  terminating: 'default',
  completed: 'success',
  crash_loop_back_off: 'error',
  error: 'error',
  container_creating: 'processing'
};

export const getStatusTextTone = (status: string): TextTone | undefined => {
  return statusTextToneMapping[snakeCase(status)];
};

export const getStatusBadgeTone = (status: string): BadgeTone | undefined => {
  return statusBadgeToneMapping[snakeCase(status)];
};

// Tag color mapping for Ant Design Tag component
// Used for Devbox state, Cluster phase, Bucket policy, etc.
const statusTagColorMapping: Record<string, string> = {
  // Common states
  running: 'green',
  pending: 'orange',
  stopped: 'default',
  error: 'red',
  failed: 'red',
  unknown: 'blue',

  // Cluster phases
  creating: 'blue',
  updating: 'blue',
  deleting: 'default',

  // Bucket policies
  public_read: 'green',
  public_readwrite: 'orange',
  private: 'default'
};

export const getStatusTagColor = (status: string): string => {
  return statusTagColorMapping[snakeCase(status)] || 'blue';
};
