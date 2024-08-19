import { ChakraProvider as CkProvider } from '@chakra-ui/react'

import { theme } from '@/constants/theme'

export const ChakraProvider = ({ children }: { children: React.ReactNode }) => {
  return <CkProvider theme={theme}>{children}</CkProvider>
}
