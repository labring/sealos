import { createClientAppConfigHook } from '@sealos/shared';
import { ClientAppConfig } from '@/src/types/config';

export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(['client-app-config']);
