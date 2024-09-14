import MyIcon from '@/components/Icon'
import PodLineChart from '@/components/PodLineChart'
import { useDevboxStore } from '@/stores/devbox'
import { NAMESPACE, SEALOS_DOMAIN } from '@/stores/static'
import { NetworkType } from '@/types/devbox'
import { Box, Flex, Text, Tooltip } from '@chakra-ui/react'
import MyTable from '@/components/MyTable'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import { useCopyData } from '@/utils/tools'

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
    <Box w={'65vw'} bg={'white'} borderRadius="lg" p={4} h={'full'} borderWidth={1}>
      {/* monitor */}
      <Box mt={4}>
        <Flex alignItems={'center'} mb={2}>
          <MyIcon name="monitor" w={'20px'} h={'20px'} mr={'10px'} color={'grayModern.600'} />
          <Text fontSize="lg" fontWeight={500} color={'grayModern.600'}>
            {t('monitor')}
          </Text>
          <Box ml={2} color={'grayModern.500'}>
            ({t('update Time')}&ensp;
            {dayjs().format('HH:mm')})
          </Box>
        </Flex>
        <Flex bg={'grayModern.50'} p={2} borderRadius={'lg'} minH={'200px'}>
          <Box flex={1} mr={4}>
            <Box color={'grayModern.600'} fontWeight={500} mb={2}>
              {t('cpu')} {devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%
            </Box>
            <Box h={'150px'} position={'relative'} w={'full'}>
              <PodLineChart type="blue" data={devboxDetail?.usedCpu} />
              <Text
                color={'#0077A9'}
                fontSize={'sm'}
                fontWeight={'bold'}
                position={'absolute'}
                right={'4px'}
                bottom={'0px'}
                pointerEvents={'none'}
                textShadow="1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF">
                {devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%
              </Text>
            </Box>
          </Box>
          <Box flex={1}>
            <Box color={'grayModern.600'} fontWeight={500} mb={2}>
              {t('memory')}{' '}
              {devboxDetail?.usedMemory?.yData[devboxDetail?.usedMemory?.yData?.length - 1]}%
            </Box>
            <Box h={'150px'} position={'relative'}>
              <PodLineChart type="purple" data={devboxDetail?.usedMemory} />
              <Text
                color={'#6F5DD7'}
                fontSize={'sm'}
                fontWeight={'bold'}
                position={'absolute'}
                right={'4px'}
                bottom={'0px'}
                pointerEvents={'none'}
                textShadow="1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF">
                {devboxDetail?.usedMemory?.yData[devboxDetail?.usedMemory?.yData?.length - 1]}%
              </Text>
            </Box>
          </Box>
        </Flex>
      </Box>
      {/* network */}
      <Box mt={4}>
        <Flex alignItems={'center'} mb={2}>
          <MyIcon name="network" w={'20px'} h={'20px'} mr={'10px'} color={'grayModern.600'} />
          <Text fontSize="lg" fontWeight={500} color={'grayModern.600'}>
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
