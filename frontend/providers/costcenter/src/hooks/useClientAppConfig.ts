import { createClientAppConfigHook } from '@sealos/shared';
import type { ClientAppConfig } from '@/types/config';

export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(['client-app-config']);
