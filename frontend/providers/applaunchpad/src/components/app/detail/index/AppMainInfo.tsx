import MyIcon from '@/components/Icon';
import { MyTooltip } from '@sealos/ui';

import PodLineChart from '@/components/PodLineChart';
import { ProtocolList } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { DOMAIN_PORT } from '@/store/static';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import { getUserNamespace } from '@/utils/user';
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useMemo, useRef } from 'react';
import MonitorModal from './MonitorModal';
import { useQuery } from '@tanstack/react-query';
import { checkReady } from '@/api/platform';

const AppMainInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const networks = useMemo(
    () =>
      app.networks.map((network) => ({
        inline: `http://${app.appName}.${getUserNamespace()}.svc.cluster.local:${network.port}`,
        public: network.openPublicDomain
          ? `${ProtocolList.find((item) => item.value === network.protocol)?.label}${
              network.customDomain
                ? network.customDomain
                : `${network.publicDomain}.${network.domain}${DOMAIN_PORT}`
            }`
          : ''
      })),
    [app]
  );

  const retryCount = useRef(0);
  const { data: networkStatus, refetch } = useQuery({
    queryKey: ['networkStatus', app.appName],
    queryFn: () => checkReady(app.appName),
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

  return (
    <Box p={'24px'} position={'relative'}>
      <>
        <Flex alignItems={'center'} fontSize={'14px'} fontWeight={'bold'}>
          <Box color={'grayModern.900'}>{t('Real-time Monitoring')}</Box>
          <Box ml={'8px'} color={'grayModern.600'}>
            ({t('Update Time')}&ensp;{dayjs().format('HH:mm')})
          </Box>
        </Flex>
        <Grid
          w={'100%'}
          templateColumns={'1fr 1fr'}
          gap={3}
          mt={'12px'}
          px={'16px'}
          py={'12px'}
          backgroundColor={'#FBFBFC'}
          borderRadius={'6px'}
          fontSize={'12px'}
          color={'grayModern.600'}
          fontWeight={'bold'}
          position={'relative'}
          className="driver-detail-monitor"
        >
          <Box>
            <Box mb={'4px'}>CPU&ensp;({app.usedCpu.yData[app.usedCpu.yData.length - 1]}%)</Box>
            <Box h={'60px'}>
              <PodLineChart type={'blue'} data={app.usedCpu} />
            </Box>
          </Box>
          <Box>
            <Box mb={'4px'}>
              {t('Memory')}&ensp;({app.usedMemory.yData[app.usedMemory.yData.length - 1]}%)
            </Box>
            <Box h={'60px'}>
              <PodLineChart type={'purple'} data={app.usedMemory} />
            </Box>
          </Box>
        </Grid>
        <Flex mt={3} alignItems={'center'} fontSize={'14px'} fontWeight={'bold'}>
          <Text color={'grayModern.900'}>{t('Network Configuration')}</Text>
          <Text ml={'8px'} color={'grayModern.600'}>
            ({networks.length})
          </Text>
        </Flex>
        <Flex mt={'12px'} className="driver-detail-network">
          <table className={'table-cross'}>
            <thead>
              <tr>
                <Box as={'th'} fontSize={'12px'}>
                  {t('Private Address')}
                </Box>
                <Box as={'th'} fontSize={'12px'}>
                  {t('Public Address')}
                </Box>
              </tr>
            </thead>
            <tbody>
              {networks.map((network, index) => {
                return (
                  <tr key={network.inline + index}>
                    <th>
                      <Flex>
                        <MyTooltip label={t('Copy')} placement={'bottom-start'}>
                          <Box
                            fontSize={'12px'}
                            cursor={'pointer'}
                            _hover={{ textDecoration: 'underline' }}
                            onClick={() => copyData(network.inline)}
                          >
                            {network.inline}
                          </Box>
                        </MyTooltip>
                      </Flex>
                    </th>
                    <th>
                      <Flex alignItems={'center'} gap={'2px'}>
                        {network.public && (
                          <>
                            {statusMap[network.public]?.ready ? (
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
                                <Center
                                  w={'6px'}
                                  h={'6px'}
                                  borderRadius={'full'}
                                  bg={'#039855'}
                                ></Center>
                                {t('Accessible')}
                              </Center>
                            ) : (
                              <Popover trigger="hover">
                                <PopoverTrigger>
                                  <Center
                                    fontSize={'12px'}
                                    fontWeight={400}
                                    bg={'rgba(17, 24, 36, 0.05)'}
                                    color={'#485264'}
                                    borderRadius={'full'}
                                    p={'2px 8px 2px 4px'}
                                    gap={'2px'}
                                    minW={'63px'}
                                    cursor={'pointer'}
                                  >
                                    <MyIcon
                                      name={'loading'}
                                      w={'12px'}
                                      h={'12px'}
                                      animation={'spin 1s linear infinite'}
                                      sx={{
                                        '@keyframes spin': {
                                          '0%': {
                                            transform: 'rotate(0deg)'
                                          },
                                          '100%': {
                                            transform: 'rotate(360deg)'
                                          }
                                        }
                                      }}
                                    />
                                    {t('Ready')}
                                  </Center>
                                </PopoverTrigger>
                                <PopoverContent w={'254px'} h={'40px'} borderRadius={'10px'}>
                                  <PopoverArrow />
                                  <PopoverBody p={'10px'}>
                                    <Box
                                      color={'grayModern.900'}
                                      fontSize={'12px'}
                                      fontWeight={'400'}
                                      lineHeight={'16px'}
                                    >
                                      {t('network_not_ready')}
                                    </Box>
                                  </PopoverBody>
                                </PopoverContent>
                              </Popover>
                            )}
                          </>
                        )}
                        <MyTooltip
                          label={network.public ? t('Open Link') : ''}
                          placement={'bottom-start'}
                        >
                          <Box
                            fontSize={'12px'}
                            className={'textEllipsis'}
                            {...(network.public
                              ? {
                                  cursor: 'pointer',
                                  _hover: { textDecoration: 'underline' },
                                  onClick: () => window.open(network.public, '_blank')
                                }
                              : {})}
                          >
                            <Flex alignItems={'center'} gap={2}>
                              {network.public || '-'}
                            </Flex>
                          </Box>
                        </MyTooltip>

                        {!!network.public && (
                          <Center
                            ml={'auto'}
                            flexShrink={0}
                            w={'24px'}
                            h={'24px'}
                            borderRadius={'6px'}
                            _hover={{
                              bg: 'rgba(17, 24, 36, 0.05)'
                            }}
                            cursor={'pointer'}
                          >
                            <MyIcon
                              name={'copy'}
                              w={'16px'}
                              color={'#667085'}
                              onClick={() => copyData(network.public)}
                            />
                          </Center>
                        )}
                      </Flex>
                    </th>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Flex>
      </>
      <MonitorModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
};

export default AppMainInfo;
