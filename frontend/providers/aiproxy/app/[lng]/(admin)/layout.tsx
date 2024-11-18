import { Flex } from '@chakra-ui/react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      height="100vh"
      width="100vw"
      padding="4px 12px 12px 12px"
      justify="center"
      align="center"
      bg="white">
      <Flex borderRadius="12px" h="full" w="full" direction="column" padding="24px 32px 18px 32px">
        {children}
      </Flex>
    </Flex>
  )
}
