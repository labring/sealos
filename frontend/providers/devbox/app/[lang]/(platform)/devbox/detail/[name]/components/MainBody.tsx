import { Box, Button, Center, Flex, Text, Tooltip, useDisclosure } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

import MyIcon from '@/components/Icon';
import MyTable from '@/components/MyTable';
import PodLineChart from '@/components/PodLineChart';

import { NetworkType } from '@/types/devbox';
import { useCopyData } from '@/utils/tools';

import { useDevboxStore } from '@/stores/devbox';
import { useEnvStore } from '@/stores/env';
import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkReady } from '@/api/platform';

const MonitorModal = dynamic(() => import('@/components/modals/MonitorModal'));

const MainBody = () => {
  const t = useTranslations();
  const { copyData } = useCopyData();
  const { devboxDetail } = useDevboxStore();
  const { env } = useEnvStore();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const retryCount = useRef(0);
  const { data: networkStatus, refetch } = useQuery({
    queryKey: ['networkStatus', devboxDetail?.name],
    queryFn: () => (devboxDetail?.name ? checkReady(devboxDetail?.name) : []),
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    onSuccess: (data) => {
      const hasUnready = data.some((item) => !item.ready);
      if (!hasUnready) {
        retryCount.current = 0;
        return;
      }
      if (retryCount.current < 14) {
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 32000);
        retryCount.current += 1;
        setTimeout(() => {
          refetch();
        }, delay);
      }
    },
    refetchIntervalInBackground: false,
    staleTime: 1000 * 60 * 5
  });

  const statusMap = useMemo(
    () =>
      networkStatus
        ? networkStatus.reduce((acc, item) => {
            if (item?.url) {
              acc[item.url] = item;
            }
            return acc;
          }, {} as Record<string, { ready: boolean; url: string }>)
        : {},
    [networkStatus]
  );

  const networkColumn: {
    title: string;
    dataIndex?: keyof NetworkType;
    key: string;
    render?: (item: NetworkType) => JSX.Element;
    width?: string;
  }[] = [
    {
      title: t('port'),
      key: 'port',
      render: (item: NetworkType) => {
        return (
          <Text pl={4} color={'grayModern.600'}>
            {item.port}
          </Text>
        );
      },
      width: '0.5fr'
    },
    {
      title: t('internal_debug_address'),
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
            borderRadius={'md'}
          >
            <Text
              cursor="pointer"
              _hover={{
                textDecoration: 'underline'
              }}
              color={'grayModern.600'}
              onClick={() =>
                copyData(
                  `http://${devboxDetail?.name}.${env.namespace}.svc.cluster.local:${item.port}`
                )
              }
            >{`http://${devboxDetail?.name}.${env.namespace}.svc.cluster.local:${item.port}`}</Text>
          </Tooltip>
        );
      }
    },
    {
      title: t('external_debug_address'),
      key: 'externalAddress',
      render: (item: NetworkType) => {
        if (item.openPublicDomain) {
          const address = item.customDomain || item.publicDomain;
          const displayAddress = `https://${address}`;
          return (
            <Flex gap={'2'} alignItems={'center'}>
              {displayAddress && (
                <>
                  {statusMap[displayAddress]?.ready ? (
                    <Center
                      fontSize={'12px'}
                      fontWeight={400}
                      bg={'rgba(3, 152, 85, 0.05)'}
                      color={'#039855'}
                      borderRadius={'full'}
                      p={'2px 8px 2px 4px'}
                      gap={'2px'}
                      minW={'63px'}
                    >
                      <Center w={'6px'} h={'6px'} borderRadius={'full'} bg={'#039855'}></Center>
                      {t('Accessible')}
                    </Center>
                  ) : (
                    <Tooltip
                      label={t('public_debug_address_tooltip')}
                      hasArrow
                      bg={'#FFFFFF'}
                      color={'grayModern.900'}
                      fontSize={'12px'}
                      fontWeight={400}
                      py={2}
                      borderRadius={'md'}
                    >
                      <Flex
                        alignItems={'center'}
                        gap={'2px'}
                        cursor="pointer"
                        fontSize={'12px'}
                        fontWeight={400}
                        w={'fit-content'}
                        bg={'rgba(17, 24, 36, 0.05)'}
                        color={'#485264'}
                        borderRadius={'full'}
                        p={'2px 8px 2px 4px'}
                      >
                        <MyIcon name={'help'} w={'16px'} color={'grayModern.500'} />
                        <Text fontSize={'12px'} w={'full'} color={'#485264'}>
                          {t('prepare')}
                        </Text>
                      </Flex>
                    </Tooltip>
                  )}
                </>
              )}
              <Tooltip
                label={t('open_link')}
                hasArrow
                bg={'#FFFFFF'}
                color={'grayModern.900'}
                fontSize={'12px'}
                fontWeight={400}
                py={2}
                borderRadius={'md'}
              >
                <Text
                  className="guide-network-address"
                  cursor="pointer"
                  color={'grayModern.600'}
                  _hover={{ textDecoration: 'underline' }}
                  onClick={() => window.open(`https://${address}`, '_blank')}
                >
                  https://{address}
                </Text>
              </Tooltip>
            </Flex>
          );
        }
        return <Text>-</Text>;
      }
    }
  ];

  return (
    <Box bg={'white'} borderRadius="lg" pl={6} pt={2} pr={6} pb={6} h={'full'} borderWidth={1}>
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
          <Box flex={1} position={'relative'}>
            <Box color={'grayModern.600'} fontWeight={'bold'} mb={2} fontSize={'12px'}>
              {t('cpu')} {devboxDetail?.usedCpu?.yData[devboxDetail?.usedCpu?.yData?.length - 1]}%
            </Box>
            <Box h={'60px'} minW={['200px', '250px', '300px']}>
              <Box h={'60px'} minW={['200px', '250px', '300px']}>
                <PodLineChart type="blue" data={devboxDetail?.usedCpu} />
              </Box>
            </Box>
          </Box>
          <Box flex={1} position={'relative'}>
            <Button
              variant={'square'}
              position={'absolute'}
              right={'2px'}
              top={'-6px'}
              onClick={onOpen}
            >
              <MyIcon name="maximize" width={'16px'} fill={'#667085'} />
            </Button>
            <Box color={'grayModern.600'} fontWeight={'bold'} mb={2} fontSize={'12px'}>
              {t('memory')}
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
        {devboxDetail?.networks && devboxDetail.networks.length > 0 ? (
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
      <MonitorModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
};

export default MainBody;
