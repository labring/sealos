'use client'
import { Box, Flex } from '@chakra-ui/react'

import SideBar from '@/components/user/Sidebar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex minH="100vh">
      <Box w="88px">
        <SideBar lng={'end'} />
      </Box>

      {/* Main Content */}
      <Box flex={1}>{children}</Box>
    </Flex>
  )
}
