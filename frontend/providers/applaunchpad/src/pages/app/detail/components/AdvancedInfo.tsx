import MyIcon from '@/components/Icon';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import type { AppDetailType } from '@/types/app';
import { useCopyData } from '@/utils/tools';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  Text,
  useTheme
} from '@chakra-ui/react';
import { MyTooltip } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import styles from '../index.module.scss';

const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));

const AdvancedInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { copyData } = useCopyData();
  const [detailConfigMap, setDetailConfigMap] = useState<{
    mountPath: string;
    value: string;
  }>();

  return (
    <Box px={'32px'} pb={'24px'}>
      <Flex
        height={'52px'}
        alignItems={'center'}
        color={'grayModern.900'}
        fontSize={'14px'}
        fontWeight={'bold'}
        justifyContent={'space-between'}
      >
        <Box>{t('Advanced Configuration')}</Box>
        icon
      </Flex>
      <Flex mt={'8px'} gap={'16px'}>
        <Box flex={'1 0 0'}>
          <Box fontSize={'12px'} fontWeight={400} color={'grayModern.600'}>
            <Text>{t('Command')}</Text>
            <Box
              borderRadius={'4px'}
              border={'1px solid #F4F4F7'}
              bg={'grayModern.25'}
              p={'12px'}
              mt={'8px'}
            >
              {[
                { label: 'Command', value: app.runCMD || 'Not Configured' },
                { label: 'Parameters', value: app.cmdParam || 'Not Configured' }
              ].map((item) => (
                <Flex
                  key={item.label}
                  _notFirst={{
                    mt: '12px'
                  }}
                >
                  <Box flex={'0 0 80px'} w={0}>
                    {t(item.label)}
                  </Box>
                  <Box color={'grayModern.900'}>{item.value}</Box>
                </Flex>
              ))}
            </Box>
          </Box>
          <Box mt={'16px'} fontSize={'12px'} fontWeight={400} color={'grayModern.600'}>
            <Text>{t('Environment Variables')}</Text>
            <Box
              borderRadius={'4px'}
              border={'1px solid #F4F4F7'}
              bg={'grayModern.25'}
              p={'12px'}
              mt={'8px'}
            >
              {app.envs?.length > 0 && (
                <Flex
                  flexDirection={'column'}
                  border={theme.borders.base}
                  bg={'#fff'}
                  borderRadius={'md'}
                >
                  {app.envs.map((env, index) => {
                    const valText = env.value ? env.value : env.valueFrom ? 'value from | ***' : '';
                    return (
                      <Flex
                        key={env.key}
                        gap={'24px'}
                        px="10px"
                        py="8px"
                        borderBottom={'1px solid'}
                        borderBottomColor={
                          index !== app.envs.length - 1 ? 'grayModern.150' : 'transparent'
                        }
                      >
                        <Box flex={1} maxW={'40%'} overflowWrap={'break-word'}>
                          {env.key}
                        </Box>
                        <MyTooltip label={valText}>
                          <Box
                            flex={1}
                            className={styles.textEllipsis}
                            style={{
                              userSelect: 'auto',
                              cursor: 'pointer'
                            }}
                            onClick={() => copyData(valText)}
                          >
                            {valText}
                          </Box>
                        </MyTooltip>
                      </Flex>
                    );
                  })}
                </Flex>
              )}
            </Box>
          </Box>
        </Box>
        <Box flex={'1 0 0'}>
          <Box fontSize={'12px'} fontWeight={400} color={'grayModern.600'}>
            <Text>ConfigMap {t('Configuration File')}</Text>
            <Box
              borderRadius={'4px'}
              border={'1px solid #F4F4F7'}
              bg={'grayModern.25'}
              p={'12px'}
              mt={'8px'}
            >
              <Box borderRadius={'md'} overflow={'hidden'} bg={'#FFF'} border={theme.borders.base}>
                {app.configMapList.map((item) => (
                  <Flex
                    key={item.mountPath}
                    alignItems={'center'}
                    px={'14px'}
                    py={'8px'}
                    cursor={'pointer'}
                    _notLast={{
                      borderBottom: theme.borders.base
                    }}
                  >
                    <MyIcon name={'configMap'} width={'24px'} height={'24px'} />
                    <Box ml={4} flex={'1 0 0'} w={0}>
                      <Box fontWeight={'bold'} color={'grayModern.900'}>
                        {item.mountPath}
                      </Box>
                      <Box className={styles.textEllipsis} color={'grayModern.600'} fontSize={'sm'}>
                        {item.value}
                      </Box>
                    </Box>
                  </Flex>
                ))}
              </Box>
            </Box>
          </Box>
          <Box mt={'16px'} fontSize={'12px'} fontWeight={400} color={'grayModern.600'}>
            <Text>{t('Storage')}</Text>
            <Box
              borderRadius={'4px'}
              border={'1px solid #F4F4F7'}
              bg={'grayModern.25'}
              p={'12px'}
              mt={'8px'}
            >
              <Box borderRadius={'md'} overflow={'hidden'} bg={'#FFF'} border={theme.borders.base}>
                {app.storeList.map((item) => (
                  <Flex
                    key={item.path}
                    alignItems={'center'}
                    px={'14px'}
                    py={'8px'}
                    _notLast={{
                      borderBottom: theme.borders.base
                    }}
                  >
                    <MyIcon name={'store'} width={'24px'} height={'24px'} />
                    <Box ml={4} flex={'1 0 0'} w={0}>
                      <Box color={'grayModern.900'} fontWeight={'bold'}>
                        {item.path}
                      </Box>
                      <Box className={styles.textEllipsis} color={'grayModern.600'} fontSize={'sm'}>
                        {item.value} Gi
                      </Box>
                    </Box>
                  </Flex>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Flex>

      {detailConfigMap && (
        <ConfigMapDetailModal {...detailConfigMap} onClose={() => setDetailConfigMap(undefined)} />
      )}
    </Box>
  );
};

export default React.memo(AdvancedInfo);
