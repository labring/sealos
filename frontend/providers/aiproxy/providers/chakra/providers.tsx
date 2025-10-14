'use client';

import { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';

import { theme } from '@/ui/chakraTheme';

export function ChakraProviders({ children }: { children: ReactNode }): JSX.Element {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}

export default ChakraProviders;
