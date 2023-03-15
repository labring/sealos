import {
  createDOMRenderer,
  FluentProvider,
  GriffelRenderer,
  RendererProvider,
  SSRProvider,
  webLightTheme,
  Theme
} from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
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

const customLightTheme: Theme = {
  ...webLightTheme,
  colorPaletteRedBorder2: '#ee4161'
};

function APP({ Component, pageProps, renderer }: EnhancedAppProps) {
  return (
    <RendererProvider renderer={renderer || createDOMRenderer()}>
      {/* @ts-ignore */}
      <SSRProvider>
        <FluentProvider theme={customLightTheme}>
          <QueryClientProvider client={queryClient}>
            <ChakraProvider>
              <Component {...pageProps} />
            </ChakraProvider>
          </QueryClientProvider>
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}

export default APP;
