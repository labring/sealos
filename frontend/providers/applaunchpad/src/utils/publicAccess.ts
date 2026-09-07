import { AppStatusEnum } from '@/constants/app';
import type { AppDetailType } from '@/types/app';

type AppAccessStatus = Pick<AppDetailType, 'status' | 'openapi'>;

export type PublicAddressStatus = {
  ready: boolean;
  url: string;
  error?: string;
};

const unhealthyUpstreamText = [
  'upstream connect error',
  'upstream not health',
  'no healthy upstream'
];

export const hasAvailableBackend = (app: AppAccessStatus) => {
  return (
    app.status.value === AppStatusEnum.running || (app.openapi?.status.availableReplicas || 0) > 0
  );
};

export const isPublicAddressAccessible = ({
  app,
  status
}: {
  app: AppAccessStatus;
  status?: PublicAddressStatus;
}) => {
  return !!status?.ready && hasAvailableBackend(app);
};

export const getPublicAddressReadyResult = async (response: Response, url: string) => {
  const text = await response.text();

  if (response.status === 404 && response.headers.get('content-length') === '0') {
    return { ready: false, url, error: '404' };
  }

  if (response.status < 200 || response.status >= 400) {
    const isUnhealthyUpstream = unhealthyUpstreamText.some((message) => text.includes(message));
    return {
      ready: false,
      url,
      error: isUnhealthyUpstream ? 'Upstream not healthy' : `HTTP ${response.status}`
    };
  }

  return { ready: true, url };
};
