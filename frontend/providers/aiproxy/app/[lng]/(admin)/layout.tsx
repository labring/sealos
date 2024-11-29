import { Box, Flex } from '@chakra-ui/react'

import SideBar from '@/components/admin/Sidebar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex height="100vh" width="100vw" direction="row">
      <Box w="88px" h="100vh">
        <SideBar />
      </Box>
      {/* Main Content */}
      <Box w="full" h="100vh" flex={1}>
        {children}
      </Box>
    </Flex>
  )
}
