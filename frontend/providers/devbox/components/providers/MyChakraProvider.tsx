import { ChakraProvider as CkProvider } from '@chakra-ui/react';

import { theme } from '@/constants/theme';

const ChakraProvider = ({ children }: { children: React.ReactNode }) => {
  return <CkProvider theme={theme}>{children}</CkProvider>;
};

export default ChakraProvider;
