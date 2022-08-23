import { createTheme, NextUIProvider } from '@nextui-org/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { AppProps } from 'next/app';
import Layout from '../layout';

import '../styles/globals.scss';

const lightTheme = createTheme({
  type: 'light',
  theme: {
    colors: {} // optional
  }
});

const darkTheme = createTheme({
  type: 'dark',
  theme: {
    colors: {} // optional
  }
});

function SealosCloud({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider
      defaultTheme="system"
      attribute="class"
      value={{
        light: lightTheme.className,
        dark: darkTheme.className
      }}
    >
      <NextUIProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </NextUIProvider>
    </NextThemesProvider>
  );
}

export default SealosCloud;
