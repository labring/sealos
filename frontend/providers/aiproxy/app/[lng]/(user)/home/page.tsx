import { Flex } from '@chakra-ui/react'

import KeyList from '@/components/user/KeyList'
import ModelList from '@/components/user/ModelList'

export default function Home(): JSX.Element {
  return (
    <Flex pt="4px" pb="12px" pr="12px" gap="8px" h="full" w="full">
      <Flex
        flexGrow="1"
        flex="4.95"
        p="24px 32px 8px 32px"
        flexDirection="column"
        alignItems="flex-start"
        gap="13px"
        bg="white"
        h="full"
        w="full"
        minW="500px"
        borderRadius="12px">
        <KeyList />
      </Flex>

      <Flex
        flexGrow="1"
        flex="1"
        bg="white"
        borderRadius="12px"
        display="inline-flex"
        p="19px 59px 23px 23px"
        flexDirection="column"
        justifyContent="flex-start"
        alignItems="flex-start"
        gap="22px"
        minW="260px"
        w="full"
        h="full"
        position="relative">
        <ModelList />
      </Flex>
    </Flex>
  )
}
