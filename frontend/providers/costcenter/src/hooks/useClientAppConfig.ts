import { createClientAppConfigHook } from '@labring/sealos-shared-sdk';
import type { ClientAppConfig } from '@/types/config';

export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(['client-app-config']);
