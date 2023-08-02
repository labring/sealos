import React, { useMemo, useState } from 'react';
import {
  Box,
  Flex,
  useTheme,
  Tag,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import type { AppDetailType } from '@/types/app';
import { useCopyData, printMemory } from '@/utils/tools';
import { useGlobalStore } from '@/store/global';
import styles from '../index.module.scss';
import dynamic from 'next/dynamic';
const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useTranslation } from 'next-i18next';
import MyTooltip from '@/components/MyTooltip';
import GPUItem from '@/components/GPUItem';
import MyIcon from '@/components/Icon';

const AppBaseInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { copyData } = useCopyData();
  const { userSourcePrice } = useGlobalStore();
  const [detailConfigMap, setDetailConfigMap] = useState<{
    mountPath: string;
    value: string;
  }>();

  const appInfoTable = useMemo<
    {
      name: string;
      iconName: string;
      items: {
        label: string;
        value?: string;
        copy?: string;
        render?: React.ReactNode;
      }[];
    }[]
  >(
    () => [
      {
        name: 'Basic Information',
        iconName: 'formInfo',
        items: [
          { label: 'Creation Time', value: app.createTime },
          {
            label: `${t('Image Name')} ${app.secret.use ? '(Private)' : ''}`,
            value: app.imageName
          },
          { label: 'Limit CPU', value: `${app.cpu / 1000} Core` },
          {
            label: 'Limit Memory',
            value: printMemory(app.memory)
          },
          ...(userSourcePrice?.gpu
            ? [
                {
                  label: 'GPU',
                  render: <GPUItem gpu={app.gpu} />
                }
              ]
            : [])
        ]
      },
      {
        name: 'Deployment Mode',
        iconName: 'deployMode',
        items: app.hpa.use
          ? [
              { label: `${app.hpa.target} ${t('target_value')}`, value: `${app.hpa.value}%` },
              {
                label: 'Number of Instances',
                value: `${app.hpa.minReplicas} ~ ${app.hpa.maxReplicas}`
              }
            ]
          : [{ label: `Number of Instances`, value: `${app.replicas}` }]
      }
    ],
    [app]
  );

  const appTags = useMemo(
    () => [
      ...(app.accessExternal.use ? ['External Access'] : []),
      ...(app.hpa.use ? ['Auto scaling'] : ['Fixed instance']),
      ...(app.storeList.length > 0 ? ['Stateful'] : ['Stateless'])
    ],
    [app]
  );

  return (
    <Box px={6} py={7} position={'relative'}>
      <>
        <Flex alignItems={'center'} color={'myGray.500'}>
          <MyIcon w={'16px'} name={'appType'}></MyIcon>
          <Box ml={2}>{t('Application Type')}</Box>
        </Flex>
        <Flex mt={5}>
          {appTags.map((tag) => (
            <Tag
              key={tag}
              borderRadius={'24px'}
              mr={4}
              backgroundColor={'myWhite.400'}
              border={'1px solid '}
              borderColor={'myGray.100'}
              px={4}
              py={1}
            >
              {t(tag)}
            </Tag>
          ))}
        </Flex>
      </>
      {appInfoTable.map((info) => (
        <Box
          _notFirst={{
            mt: 6
          }}
          key={info.name}
        >
          <Flex alignItems={'center'} color={'myGray.500'}>
            <MyIcon w={'16px'} name={info.iconName as any}></MyIcon>
            <Box ml={2}>{t(info.name)}</Box>
          </Flex>
          <Box mt={3} p={4} backgroundColor={'myWhite.400'} borderRadius={'sm'}>
            {info.items.map((item, i) => (
              <Flex
                key={item.label || i}
                flexWrap={'wrap'}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box flex={'0 0 110px'} w={0} color={'blackAlpha.800'}>
                  {t(item.label)}
                </Box>
                <Box
                  color={'blackAlpha.600'}
                  flex={'1 0 0'}
                  textOverflow={'ellipsis'}
                  overflow={'hidden'}
                  whiteSpace={'nowrap'}
                >
                  <MyTooltip label={item.value}>
                    <Box
                      as="span"
                      cursor={!!item.copy ? 'pointer' : 'default'}
                      onClick={() => item.value && !!item.copy && copyData(item.copy)}
                    >
                      {item.render ? item.render : item.value}
                    </Box>
                  </MyTooltip>
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>
      ))}
      <Box mt={6}>
        <Flex alignItems={'center'} color={'myGray.500'}>
          <MyIcon w={'16px'} name={'settings'}></MyIcon>
          <Box ml={2}>{t('Advanced Configuration')}</Box>
        </Flex>
        <Box mt={2} pt={4} backgroundColor={'myWhite.400'} borderRadius={'sm'}>
          {[
            { label: 'Command', value: app.runCMD || 'Not Configured' },
            { label: 'Parameters', value: app.cmdParam || 'Not Configured' }
          ].map((item) => (
            <Flex
              key={item.label}
              _notFirst={{
                mt: 4
              }}
              px={4}
            >
              <Box flex={'0 0 80px'} w={0} color={'blackAlpha.800'}>
                {t(item.label)}
              </Box>
              <Box
                flex={1}
                w={'0'}
                textAlign={'right'}
                color={'myGray.600'}
                textOverflow={'ellipsis'}
                overflow={'hidden'}
                whiteSpace={'nowrap'}
                onClick={() => copyData(item.value)}
                cursor={'pointer'}
              >
                <MyTooltip label={item.value}>{t(item.value)}</MyTooltip>
              </Box>
            </Flex>
          ))}
          {/* env */}
          <Accordion allowToggle defaultIndex={0} mt={4}>
            <AccordionItem borderBottom={0}>
              <AccordionButton
                py={4}
                display={'flex'}
                textAlign={'left'}
                _hover={{ backgroundColor: 'transparent' }}
              >
                <Box flex={1} color={'blackAlpha.800'}>
                  {t('Environment Variables')}
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pt={0} pb={app.envs.length === 0 ? 0 : 3}>
                <table className={styles.table}>
                  <tbody>
                    {app.envs.map((env) => {
                      const valText = env.value
                        ? env.value
                        : env.valueFrom
                        ? 'value from | ***'
                        : '';
                      return (
                        <tr key={env.key}>
                          <th>{env.key}</th>
                          <MyTooltip label={valText}>
                            <th
                              className={styles.textEllipsis}
                              style={{
                                userSelect: 'auto',
                                cursor: 'pointer'
                              }}
                              onClick={() => copyData(valText)}
                            >
                              {valText}
                            </th>
                          </MyTooltip>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          {/* configMap */}
          <Accordion allowToggle defaultIndex={0}>
            <AccordionItem borderBottom={0}>
              <AccordionButton
                display={'flex'}
                textAlign={'left'}
                py={4}
                _hover={{ backgroundColor: 'transparent' }}
              >
                <Box flex={1} color={'blackAlpha.800'}>
                  {t('Configuration File')}
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel py={0}>
                <Box
                  borderRadius={'sm'}
                  overflow={'hidden'}
                  {...(app.configMapList.length > 0
                    ? {
                        mb: 3,
                        border: theme.borders.base
                      }
                    : {})}
                >
                  {app.configMapList.map((item) => (
                    <Flex
                      key={item.mountPath}
                      alignItems={'center'}
                      px={4}
                      py={2}
                      cursor={'pointer'}
                      onClick={() => setDetailConfigMap(item)}
                      bg={'myWhite.200'}
                      _notLast={{
                        borderBottom: theme.borders.base
                      }}
                    >
                      <MyIcon name={'configMap'} />
                      <Box ml={4} flex={'1 0 0'} w={0}>
                        <Box color={'myGray.900'}>{item.mountPath}</Box>
                        <Box className={styles.textEllipsis} color={'myGray.500'} fontSize={'sm'}>
                          {item.value}
                        </Box>
                      </Box>
                    </Flex>
                  ))}
                </Box>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          {/* store */}
          <Accordion allowToggle defaultIndex={0}>
            <AccordionItem borderBottom={0}>
              <AccordionButton
                display={'flex'}
                textAlign={'left'}
                py={4}
                _hover={{ backgroundColor: 'transparent' }}
              >
                <Box flex={1} color={'blackAlpha.800'}>
                  {t('Storage')}
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel py={0}>
                <Box
                  borderRadius={'sm'}
                  overflow={'hidden'}
                  {...(app.storeList.length > 0
                    ? {
                        mb: 4,
                        border: theme.borders.base
                      }
                    : {})}
                >
                  {app.storeList.map((item) => (
                    <Flex
                      key={item.path}
                      alignItems={'center'}
                      px={4}
                      py={1}
                      _notLast={{
                        borderBottom: theme.borders.base
                      }}
                      bg={'myWhite.200'}
                    >
                      <MyIcon name={'store'} />
                      <Box ml={4} flex={'1 0 0'} w={0}>
                        <Box color={'myGray.900'} fontWeight={'bold'}>
                          {item.path}
                        </Box>
                        <Box className={styles.textEllipsis} color={'myGray.500'} fontSize={'sm'}>
                          {item.value} Gi
                        </Box>
                      </Box>
                    </Flex>
                  ))}
                </Box>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>
      </Box>

      {detailConfigMap && (
        <ConfigMapDetailModal {...detailConfigMap} onClose={() => setDetailConfigMap(undefined)} />
      )}
    </Box>
  );
};

export default React.memo(AppBaseInfo);
