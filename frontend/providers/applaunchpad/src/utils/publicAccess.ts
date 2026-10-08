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

  const isUnhealthyUpstream = unhealthyUpstreamText.some((message) => text.includes(message));
  if (isUnhealthyUpstream) {
    return {
      ready: false,
      url,
      error: 'Upstream not healthy'
    };
  }

  return { ready: true, url };
};
