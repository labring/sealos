import {
  createDOMRenderer,
  FluentProvider,
  GriffelRenderer,
  RendererProvider,
  SSRProvider,
  webLightTheme
} from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';

import '../styles/globals.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

type EnhancedAppProps = AppProps & { renderer?: GriffelRenderer };

function APP({ Component, pageProps, renderer }: EnhancedAppProps) {
  return (
    // 👇 Accepts a renderer from <Document /> or creates a default one
    //    Also triggers rehydration a client
    <RendererProvider renderer={renderer || createDOMRenderer()}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>
          <QueryClientProvider client={queryClient}>
            <Component {...pageProps} />
          </QueryClientProvider>
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}

export default APP;
