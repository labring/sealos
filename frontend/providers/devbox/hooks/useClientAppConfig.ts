import { createClientAppConfigHook } from '@sealos/shared';
import { ClientAppConfig } from '@/types/config';

export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(['client-app-config']);
