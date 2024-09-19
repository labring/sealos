import React from 'react'
import { useTranslations } from 'next-intl'
import { Flex, Box } from '@chakra-ui/react'

import type { DevboxReleaseStatusMapType, DevboxStatusMapType } from '@/types/devbox'

const DevboxStatusTag = ({
  status,
  showBorder = false
}: {
  status: DevboxStatusMapType | DevboxReleaseStatusMapType
  showBorder?: boolean
}) => {
  const label = status.label
  const t = useTranslations()

  return (
    <Flex
      color={status.color}
      backgroundColor={status.backgroundColor}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={status.color}
      py={1}
      px={4}
      borderRadius={'24px'}
      fontSize={'xs'}
      fontWeight={'bold'}
      alignItems={'center'}
      minW={'60px'}
      whiteSpace={'nowrap'}>
      <Box w={'6px'} h={'6px'} borderRadius={'10px'} backgroundColor={status.dotColor}></Box>
      <Box ml={2} flex={1}>
        {t(label)}
      </Box>
    </Flex>
  )
}

export default DevboxStatusTag
