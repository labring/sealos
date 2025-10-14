import { Box, Flex } from '@chakra-ui/react';

import SideBar from '@/components/admin/Sidebar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex height="full" width="full" direction="row">
      <Box w="80px" h="full" minW="80px">
        <SideBar />
      </Box>
      {/* Main Content */}
      <Box w="full" h="full">
        {children}
      </Box>
    </Flex>
  );
}
