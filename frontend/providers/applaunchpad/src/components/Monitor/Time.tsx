import { formatDateTimeInTimeZone, getBrowserTimeZone } from '@/utils/timeRange';

export default function DynamicTime({ lastRefreshTime }: { lastRefreshTime?: number }) {
  if (!lastRefreshTime) {
    return <span>--:--:--</span>;
  }

  return <span>{formatDateTimeInTimeZone(lastRefreshTime, getBrowserTimeZone(), 'HH:mm:ss')}</span>;
}
