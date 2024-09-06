import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Box, Flex, useTheme, Text } from '@chakra-ui/react'

import { SOURCE_PRICE } from '@/stores/static'

export const colorMap = {
  cpu: '#33BABB',
  memory: '#36ADEF',
  nodeports: '#8172D8'
}

const PriceBox = ({
  components = []
}: {
  components: {
    cpu: number
    memory: number
    nodeports: number
  }[]
}) => {
  const theme = useTheme()
  const t = useTranslations()
  const priceList: {
    label: string
    color: string
    value: string
  }[] = useMemo(() => {
    let cp = 0
    let mp = 0
    let pp = 0
    let tp = 0

    components.forEach(({ cpu, memory, nodeports }) => {
      cp = (SOURCE_PRICE.cpu * cpu * 24) / 1000
      mp = (SOURCE_PRICE.memory * memory * 24) / 1024
      pp = SOURCE_PRICE.nodeports * nodeports * 24
      tp = cp + mp + pp
    })

    return [
      {
        label: 'cpu',
        color: '#33BABB',
        value: cp.toFixed(2)
      },
      { label: 'memory', color: '#36ADEF', value: mp.toFixed(2) },
      {
        label: 'nodeports',
        color: '#8172D8',
        value: pp.toFixed(2)
      },
      { label: 'total_price', color: '#485058', value: tp.toFixed(2) }
    ]
  }, [components])

  return (
    <Box bg={'#FFF'} borderRadius={'md'} border={theme.borders.base}>
      <Flex py={3} px={'20px'} borderBottom={theme.borders.base} gap={'8px'}>
        <Text color={'grayModern.900'} fontWeight={500}>
          {t('estimated_price')}
        </Text>
        <Text color={'grayModern.500'}> ({t('daily')})</Text>
      </Flex>
      <Flex flexDirection={'column'} gap={'12px'} py={'16px'} px={'20px'}>
        {priceList.map((item) => (
          <Flex key={item.label} alignItems={'center'}>
            <Box bg={item.color} w={'8px'} h={'8px'} borderRadius={'10px'} mr={2}></Box>
            <Box flex={'0 0 65px'}>{t(item.label)}:</Box>
            <Flex alignItems={'center'} gap={'4px'}>
              ￥{item.value}
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}

export default PriceBox