# Client App Config

## Usage

### 1. Create typed hook

```typescript
// src/hooks/useClientAppConfig.ts
import { createClientAppConfigHook } from '@sealos/shared';
import { ClientAppConfig } from '@/types/config';

export const useClientAppConfig = createClientAppConfigHook<ClientAppConfig>(['client-app-config']);
```

### 2. Setup client-side defaults

```typescript
// src/pages/_app.tsx
import { setupClientAppConfigDefaults } from '@sealos/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 0 // Global default
    }
  }
});

setupClientAppConfigDefaults(queryClient, ['client-app-config']);
```

### 3. Prefetch on server side

```typescript
// src/pages/_app.tsx
import { prefetchClientAppConfig } from '@sealos/shared';
import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';

MyApp.getInitialProps = async (context: AppContext) => {
  const ctx = await App.getInitialProps(context);

  let dehydratedState: unknown;
  try {
    if (typeof window === 'undefined') {
      const qc = new QueryClient();
      await prefetchClientAppConfig(qc, ['client-app-config'], getClientAppConfigServer);
      dehydratedState = dehydrate(qc);
    }
  } catch (error) {
    console.error('Failed to prefetch client app config:', error);
  }

  return { ...ctx, dehydratedState };
};
```

### 4. Wrap app with providers

```typescript
// src/pages/_app.tsx
import { ClientConfigProvider } from '@sealos/shared';

const MyApp = ({ Component, pageProps, dehydratedState }: AppProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider dehydratedState={dehydratedState}>
        <Component {...pageProps} />
      </ClientConfigProvider>
    </QueryClientProvider>
  );
};
```

### 5. Use in components

```typescript
import { useClientAppConfig } from '@/hooks/useClientAppConfig';

function MyComponent() {
  const config = useClientAppConfig();
  return <div>{config.ui.brandName}</div>;
}
```
