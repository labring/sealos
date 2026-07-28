import { formatShanghaiDateTime } from '@/utils/timeRange';

export default function DynamicTime({ lastRefreshTime }: { lastRefreshTime?: number }) {
  if (!lastRefreshTime) {
    return <span>--:--:--</span>;
  }

  return <span>{formatShanghaiDateTime(lastRefreshTime, 'HH:mm:ss')}</span>;
}
