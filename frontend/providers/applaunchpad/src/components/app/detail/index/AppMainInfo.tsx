import MyIcon from '@/components/Icon';
import { MyTooltip } from '@sealos/ui';

import PodLineChart from '@/components/PodLineChart';
import { ProtocolList } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { DOMAIN_PORT } from '@/store/static';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import { getUserNamespace } from '@/utils/user';
import { Box, Button, Center, Flex, Grid, Text, useDisclosure } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import MonitorModal from './MonitorModal';

const AppMainInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const networks = useMemo(
    () =>
      app.networks.map((network) => {
        const protocol = ProtocolList.find((item) => item.value === network.protocol);
        const appProtocol = ProtocolList.find((item) => item.value === network.appProtocol);

        if (network.openNodePort) {
          return {
            inline: `${protocol?.inline}${app.appName}.${getUserNamespace()}.svc.cluster.local:${
              network.port
            }`,
            public: `${protocol?.label}${network.domain}${
              network?.nodePort ? `:${network.nodePort}` : ''
            }`
          };
        }

        return {
          inline: `${appProtocol?.inline}${app.appName}.${getUserNamespace()}.svc.cluster.local:${
            network.port
          }`,
          public: network.openPublicDomain
            ? `${appProtocol?.label}${
                network.customDomain
                  ? network.customDomain
                  : `${network.publicDomain}.${network.domain}${DOMAIN_PORT}`
              }`
            : ''
        };
      }),
    [app]
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
                      <Flex alignItems={'center'} justifyContent={'space-between'}>
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
                            {network.public || '-'}
                          </Box>
                        </MyTooltip>
                        {!!network.public && (
                          <Center
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
