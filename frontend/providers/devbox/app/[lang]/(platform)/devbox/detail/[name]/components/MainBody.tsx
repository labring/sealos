import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { Box, Flex, Text, Tooltip } from '@chakra-ui/react'

import MyIcon from '@/components/Icon'
import MyTable from '@/components/MyTable'
import { useCopyData } from '@/utils/tools'
import { NetworkType } from '@/types/devbox'
import { useDevboxStore } from '@/stores/devbox'
import PodLineChart from '@/components/PodLineChart'
import { NAMESPACE, SEALOS_DOMAIN } from '@/stores/static'

const MainBody = () => {
  const t = useTranslations()
  const { copyData } = useCopyData()
  const { devboxDetail } = useDevboxStore()

  const networkColumn: {
    title: string
    dataIndex?: keyof NetworkType
    key: string
    render?: (item: NetworkType) => JSX.Element
  }[] = [
    {
      title: t('internal_address'),
      key: 'internalAddress',
      render: (item: NetworkType) => {
        return (
          <Tooltip
            label={t('copy')}
            hasArrow
            bg={'#FFFFFF'}
            color={'grayModern.900'}
            fontSize={'12px'}
            fontWeight={400}
            py={2}
            borderRadius={'md'}>
            <Text
              cursor="pointer"
              _hover={{
                textDecoration: 'underline'
              }}
              ml={4}
              color={'grayModern.600'}
              onClick={() =>
                copyData(`http://${devboxDetail?.name}.${NAMESPACE}.svc.cluster.local:${item.port}`)
              }>{`http://${devboxDetail?.name}.${NAMESPACE}.svc.cluster.local:${item.port}`}</Text>
          </Tooltip>
        )
      }
    },
    {
      title: t('external_address'),
      key: 'externalAddress',
      render: (item: NetworkType) => {
        if (item.openPublicDomain) {
          const address = item.customDomain || `${item.publicDomain}.${SEALOS_DOMAIN}`
          return (
            <Tooltip
              label={t('open_link')}
              hasArrow
              bg={'#FFFFFF'}
              color={'grayModern.900'}
              fontSize={'12px'}
              fontWeight={400}
              py={2}
              borderRadius={'md'}>
              <Text
                cursor="pointer"
                color={'grayModern.600'}
                _hover={{ textDecoration: 'underline' }}
                onClick={() => window.open(`https://${address}`, '_blank')}>
                https://{address}
              </Text>
            </Tooltip>
          )
        }
        return <Text>-</Text>
      }
    }
  ]
  return (
    <Box
      w={'65vw'}
      bg={'white'}
      borderRadius="lg"
      pl={6}
      pt={2}
      pr={6}
      pb={6}
      h={'full'}
      borderWidth={1}>
      {/* monitor */}
      <Box mt={4}>
        <Flex alignItems={'center'} mb={2}>
          <MyIcon name="monitor" w={'15px'} h={'15px'} mr={'5px'} color={'grayModern.600'} />
          <Text fontSize="base" fontWeight={'bold'} color={'grayModern.600'}>
            {t('monitor')}
          </Text>
          <Box ml={2} color={'grayModern.500'}>
            ({t('update Time')}&ensp;
            {dayjs().format('HH:mm')})
          </Box>
        </Flex>
        <Flex bg={'grayModern.50'} p={4} borderRadius={'lg'} minH={'80px'} gap={4}>
          <Box flex={1}>
            <Box color={'grayModern.600'} fontWeight={'bold'} mb={2} fontSize={'12px'}>
              {t('cpu')} {devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%
            </Box>
            <Box h={'60px'} minW={'180px'}>
              <Box h={'60px'} minW={'180px'}>
                <PodLineChart type="blue" data={devboxDetail?.usedCpu} />
              </Box>
            </Box>
          </Box>
          <Box flex={1}>
            <Box color={'grayModern.600'} fontWeight={'bold'} mb={2} fontSize={'12px'}>
              {t('memory')}{' '}
              {devboxDetail?.usedMemory?.yData[devboxDetail?.usedMemory?.yData?.length - 1]}%
            </Box>
            <Box h={'60px'}>
              <Box h={'60px'}>
                <PodLineChart type="purple" data={devboxDetail?.usedMemory} />
              </Box>
            </Box>
          </Box>
        </Flex>
      </Box>
      {/* network */}
      <Box mt={4}>
        <Flex alignItems={'center'} mb={2}>
          <MyIcon name="network" w={'15px'} h={'15px'} mr={'5px'} color={'grayModern.600'} />
          <Text fontSize="base" fontWeight={'bold'} color={'grayModern.600'}>
            {t('network')} ( {devboxDetail?.networks?.length} )
          </Text>
        </Flex>
        {devboxDetail?.networks?.length > 0 ? (
          <MyTable
            columns={networkColumn}
            data={devboxDetail?.networks}
            alternateRowColors={true}
          />
        ) : (
          <Flex justify={'center'} align={'center'} h={'100px'}>
            <Text color={'grayModern.600'}>{t('no_network')}</Text>
          </Flex>
        )}
      </Box>
    </Box>
  )
}

export default MainBody
