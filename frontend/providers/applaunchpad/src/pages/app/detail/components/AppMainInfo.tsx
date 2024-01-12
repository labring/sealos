import MyIcon from '@/components/Icon';
import MyTooltip from '@/components/MyTooltip';
import PodLineChart from '@/components/PodLineChart';
import { ProtocolList } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { DOMAIN_PORT, SEALOS_DOMAIN } from '@/store/static';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import { getUserNamespace } from '@/utils/user';
import { Box, Flex, Grid } from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';

const AppMainInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();

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
        <Flex alignItems={'center'}>
          <MyIcon name={'listen'} w={'14px'} color={'myGray.500'} />
          <Box ml={3} color={'myGray.600'}>
            {t('Real-time Monitoring')}
          </Box>
          <Box ml={2} color={'myGray.400'}>
            ({t('Update Time')}&ensp;
            {dayjs().format('HH:mm')})
          </Box>
        </Flex>
        <Grid
          w={'100%'}
          templateColumns={'1fr 1fr'}
          gap={3}
          mt={2}
          p={3}
          backgroundColor={'#F8F8FA'}
          borderRadius={'sm'}
        >
          <Box>
            <Box mb={2} fontSize={'sm'}>
              CPU&ensp;({app.usedCpu.yData[app.usedCpu.yData.length - 1]}%)
            </Box>
            <Box h={'80px'}>
              <PodLineChart type={'blue'} data={app.usedCpu} />
            </Box>
          </Box>
          <Box>
            <Box mb={2} fontSize={'sm'}>
              {t('Memory')}&ensp;({app.usedMemory.yData[app.usedMemory.yData.length - 1]}%)
            </Box>
            <Box h={'80px'}>
              <PodLineChart type={'purple'} data={app.usedMemory} />
            </Box>
          </Box>
        </Grid>
        <Flex mt={3} alignItems={'center'}>
          <MyIcon name={'network'} w={'14px'} color={'myGray.500'} />
          <Box ml={3} color={'myGray.600'}>
            {t('Network Configuration')}({networks.length})
          </Box>
        </Flex>
        <Flex mt={2}>
          <table className={'table-cross'}>
            <thead>
              <tr>
                <Box as={'th'} bg={'myWhite.600'}>
                  {t('Private Address')}
                </Box>
                <Box as={'th'} bg={'myWhite.600'}>
                  {t('Public Address')}
                </Box>
              </tr>
            </thead>
            <tbody>
              {networks.map((network) => {
                return (
                  <tr key={network.inline}>
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
                            color={'myGray.400'}
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
    </Box>
  );
};

export default AppMainInfo;
