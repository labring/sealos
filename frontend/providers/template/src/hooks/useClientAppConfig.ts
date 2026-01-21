import { createClientAppConfigHook } from '@sealos/shared';
import { ClientAppConfig } from '@/types/config';
import { getClientAppConfig } from '@/api/platform';

/**
 * Hook to access client app configuration
 */
export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(
  ['client-app-config'],
  getClientAppConfig
);
