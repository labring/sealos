'use client';

import { Flex } from '@chakra-ui/react';

import KeyList from '@/components/user/KeyList';
export default function Key(): JSX.Element {
  return (
    <Flex pt="4px" pb="12px" pr="12px" gap="8px" h="full" w="full">
      <Flex
        flexGrow="1"
        p="24px 32px 8px 32px"
        flexDirection="column"
        alignItems="flex-start"
        gap="13px"
        bg="white"
        h="full"
        w="full"
        minW="500px"
        borderRadius="12px"
      >
        <KeyList />
      </Flex>
    </Flex>
  );
}
