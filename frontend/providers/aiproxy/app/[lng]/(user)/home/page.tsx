import { Flex } from '@chakra-ui/react'

import KeyList from '@/components/user/KeyList'
import ModelList from '@/components/user/ModelList'

export default function Home(): JSX.Element {
  return (
    <Flex pt="4px" pb="12px" pr="12px" gap="8px" h="100vh" w="full">
      <Flex
        flex={4.95}
        flexShrink={0}
        display="inline-flex"
        p="24px 32px 167px 32px"
        flexDirection="column"
        alignItems="flex-start"
        gap="13px"
        bg="white"
        h="full"
        w="full"
        borderRadius="12px">
        <KeyList />
      </Flex>

      <Flex
        flex={1}
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
        overflow="auto">
        <ModelList />
      </Flex>
    </Flex>
  )
}
