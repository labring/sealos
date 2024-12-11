import { Box, Flex } from '@chakra-ui/react'
import React, { useMemo } from 'react'
import MyIcon from './Icon'
import { GpuType } from '@/types/user'
import { useTranslation } from 'next-i18next'
import { usePriceStore } from '@/stores/price'

const GPUItem = ({ gpu }: { gpu?: GpuType }) => {
  const { t } = useTranslation()
  const { sourcePrice } = usePriceStore()

  const gpuAlias = useMemo(() => {
    const gpuItem = sourcePrice?.gpu?.find((item) => item.type === gpu?.type)

    return gpuItem?.alias || gpu?.type || ''
  }, [gpu?.type, sourcePrice?.gpu])

  return (
    <Flex whiteSpace={'nowrap'}>
      <MyIcon name={'nvidia'} w={'16px'} mr={2} />
      {gpuAlias && (
        <>
          <Box fontSize={'12px'}>{gpuAlias}</Box>
          <Box mx={1} color={'grayModern.500'}>
            /
          </Box>
        </>
      )}
      <Box color={!!gpu?.amount ? 'myGray.600' : 'grayModern.500'} fontSize={'12px'}>
        {!!gpuAlias ? gpu?.amount : 0}

        {t('Card')}
      </Box>
    </Flex>
  )
}

export default React.memo(GPUItem)
