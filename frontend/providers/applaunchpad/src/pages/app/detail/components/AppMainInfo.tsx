import MyIcon from '@/components/Icon';
import { MyTooltip } from '@sealos/ui';

import PodLineChart from '@/components/PodLineChart';
import { ProtocolList } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { DOMAIN_PORT, SEALOS_DOMAIN } from '@/store/static';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import { getUserNamespace } from '@/utils/user';
import { Box, Button, Center, Flex, Grid, useDisclosure } from '@chakra-ui/react';
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
      app.networks.map((network) => ({
        inline: `http://${app.appName}.${getUserNamespace()}.svc.cluster.local:${network.port}`,
        public: network.openPublicDomain
          ? `${ProtocolList.find((item) => item.value === network.protocol)?.label}${
              network.customDomain
                ? network.customDomain
                : `${network.publicDomain}.${SEALOS_DOMAIN}${DOMAIN_PORT}`
            }`
          : ''
      })),
    [app]
  );

  return (
    <Box px={6} py={6} position={'relative'}>
      <>
        <Flex alignItems={'center'} fontSize={'12px'} fontWeight={'bold'}>
          <MyIcon name={'listen'} w={'14px'} color={'grayModern.600'} />
          <Box ml={'12px'} color={'grayModern.600'}>
            {t('Real-time Monitoring')}
          </Box>
          <Box ml={2} color={'grayModern.500'}>
            ({t('Update Time')}&ensp;
            {dayjs().format('HH:mm')})
          </Box>
        </Flex>
        <Grid
          w={'100%'}
          templateColumns={'1fr 1fr'}
          gap={3}
          mt={2}
          p={'16px'}
          backgroundColor={'grayModern.50'}
          borderRadius={'md'}
          fontSize={'12px'}
          color={'grayModern.600'}
          fontWeight={'bold'}
          position={'relative'}
        >
          <Button
            variant={'square'}
            position={'absolute'}
            right={'12px'}
            top={'8px'}
            onClick={onOpen}
          >
            <MyIcon name="enlarge" width={'16px'} fill={'#667085'} />
          </Button>
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
        <Flex
          mt={3}
          alignItems={'center'}
          fontSize={'12px'}
          color={'grayModern.600'}
          fontWeight={'bold'}
        >
          <MyIcon name={'network'} w={'14px'} />
          <Box ml={'12px'}>
            {t('Network Configuration')}({networks.length})
          </Box>
        </Flex>
        <Flex mt={'12px'}>
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
                            cursor={'pointer'}
                            _hover={{ textDecoration: 'underline' }}
                            onClick={() => copyData(network.inline)}
                          >
                            {network.inline}
                          </Box>
                        </MyTooltip>
                      </Flex>
                    </th>
                    <th className="driver-detail-network-public">
                      <Flex alignItems={'center'} justifyContent={'space-between'}>
                        <MyTooltip
                          label={network.public ? t('Open Link') : ''}
                          placement={'bottom-start'}
                        >
                          <Box
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
                          <MyIcon
                            cursor={'pointer'}
                            mr={2}
                            name={'copy'}
                            w={'14px'}
                            color={'grayModern.500'}
                            _hover={{
                              color: 'hover.iconBlue'
                            }}
                            onClick={() => copyData(network.public)}
                          />
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
