import { theme } from '@/constants/theme'
import { ChakraProvider as CkProvider } from '@chakra-ui/react'

export const ChakraProvider = ({ children }: { children: React.ReactNode }) => {
  return <CkProvider theme={theme}>{children}</CkProvider>
}
