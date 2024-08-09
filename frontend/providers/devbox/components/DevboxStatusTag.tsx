import React from 'react'
import { Flex, Box } from '@chakra-ui/react'

import type { DevboxStatusMapType } from '@/types/devbox'

const DevboxStatusTag = ({
  status,
  showBorder = false
}: {
  status: DevboxStatusMapType
  showBorder?: boolean
}) => {
  const label = status.label

  return (
    <>
      <Flex
        color={status.color}
        backgroundColor={status.backgroundColor}
        border={showBorder ? '1px solid' : 'none'}
        borderColor={status.color}
        py={2}
        px={3}
        borderRadius={'24px'}
        fontSize={'xs'}
        fontWeight={'bold'}
        alignItems={'center'}
        minW={'88px'}
        whiteSpace={'nowrap'}>
        <Box w={'6px'} h={'6px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
        <Box ml={2} flex={1}>
          {label}
        </Box>
      </Flex>
    </>
  )
}

export default DevboxStatusTag
