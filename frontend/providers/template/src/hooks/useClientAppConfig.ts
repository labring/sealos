import { createClientAppConfigHook } from '@sealos/shared';
import { ClientAppConfig } from '@/types/config';

/**
 * Hook to access pre-fetched client app configuration.
 * Configuration is pre-fetched in _app.tsx getInitialProps.
 */
export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(['client-app-config']);
