import React, { useMemo } from 'react';
import { Box, Flex, Grid, Link } from '@chakra-ui/react';
import type { AppDetailType } from '@/types/app';
import PodLineChart from '@/components/PodLineChart';
import { printMemory, useCopyData } from '@/utils/tools';
import dayjs from 'dayjs';
import { getUserNamespace } from '@/utils/user';
import { SEALOS_DOMAIN, DOMAIN_PORT } from '@/store/static';
import MyIcon from '@/components/Icon';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useTranslation } from 'next-i18next';

const AppMainInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const inlineNetwork = useMemo(
    () => `http://${app.appName}.${getUserNamespace()}.svc.cluster.local:${app.containerOutPort}`,
    [app]
  );
  const outlineNetwork = useMemo(
    () =>
      app.accessExternal.use
        ? `https://${
            app.accessExternal.selfDomain ||
            `${app.accessExternal.outDomain}.${SEALOS_DOMAIN}${DOMAIN_PORT}`
          }`
        : '',
    [app]
  );

  const cpuUsed = useMemo(
    () => `${((app.usedCpu[app.usedCpu.length - 1] / app.cpu) * 100).toFixed(2)}%`,
    [app]
  );
  const memoryUsed = useMemo(() => printMemory(app.usedMemory[app.usedMemory.length - 1]), [app]);

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
            {dayjs().format('HH:mm:ss')})
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
              CPU&ensp;({cpuUsed})
            </Box>
            <Box h={'80px'}>
              <PodLineChart type={'blue'} data={app.usedCpu.slice(-15)} limit={app.cpu} />
            </Box>
          </Box>
          <Box>
            <Box mb={2} fontSize={'sm'}>
              {t('Memory')}&ensp;({memoryUsed})
            </Box>
            <Box h={'80px'}>
              <PodLineChart type={'purple'} data={app.usedMemory.slice(-15)} limit={app.memory} />
            </Box>
          </Box>
        </Grid>
        <Flex mt={3} alignItems={'center'}>
          <MyIcon name={'network'} w={'14px'} color={'myGray.500'} />
          <Box ml={3} color={'myGray.600'}>
            {t('Network Configuration')}
          </Box>
        </Flex>
        <Flex mt={2}>
          <Flex
            flex={'1 0 0'}
            w={0}
            _notLast={{
              mr: 4
            }}
            p={3}
            backgroundColor={'myWhite.400'}
            borderRadius={'sm'}
          >
            <Box mr={3}>{t('Private Address')}</Box>
            <Box flex={'1 0 0'} w={0} color={'myGray.600'}>
              {inlineNetwork}
            </Box>
            <MyIcon
              cursor={'pointer'}
              mr={2}
              name={'copy'}
              w={'14px'}
              color={'myGray.400'}
              _hover={{
                color: 'hover.iconBlue'
              }}
              onClick={() => copyData(inlineNetwork)}
            />
          </Flex>
          <Flex
            flex={'1 0 0'}
            w={0}
            _notLast={{
              mr: 4
            }}
            p={3}
            backgroundColor={'myWhite.400'}
            borderRadius={'sm'}
          >
            <Box mr={3}>{t('Public Address')}</Box>
            {outlineNetwork ? (
              <>
                <Link
                  href={outlineNetwork}
                  target={'_blank'}
                  flex={'1 0 0'}
                  w={0}
                  color={'myGray.600'}
                >
                  {outlineNetwork}
                </Link>
                <MyIcon
                  cursor={'pointer'}
                  mr={2}
                  name={'copy'}
                  w={'14px'}
                  color={'myGray.400'}
                  _hover={{
                    color: 'hover.iconBlue'
                  }}
                  onClick={() => copyData(outlineNetwork)}
                />
              </>
            ) : (
              <Box flex={'1 0 0'} w={0} userSelect={'none'} color={'black'}>
                {t('Not Enabled')}
              </Box>
            )}
          </Flex>
        </Flex>
      </>
    </Box>
  );
};

export default AppMainInfo;
