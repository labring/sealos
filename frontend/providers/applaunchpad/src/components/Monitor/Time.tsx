import dayjs from 'dayjs';

export default function DynamicTime({ lastRefreshTime }: { lastRefreshTime?: number }) {
  if (!lastRefreshTime) {
    return <span>--:--:--</span>;
  }

  return <span>{dayjs(lastRefreshTime).format('HH:mm:ss')}</span>;
}
