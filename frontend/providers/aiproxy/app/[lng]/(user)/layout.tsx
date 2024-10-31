import { Box, Flex } from '@chakra-ui/react';

import SideBar from '@/components/user/Sidebar';

export default async function UserLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { lng: string };
}): Promise<JSX.Element> {
  const { lng } = await params;
  return (
    <Flex minH="100vh">
      {/* Left Sidebar */}
      <Box w="88px">
        <SideBar lng={lng} />
      </Box>

      {/* Main Content */}
      <Box flex={1}>{children}</Box>
    </Flex>
  );
}
