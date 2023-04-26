import React, { useMemo, useState } from 'react';
import {
  Box,
  Flex,
  useTheme,
  Tooltip,
  Tag,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  AccordionIcon,
  Button
} from '@chakra-ui/react';
import type { AppDetailType } from '@/types/app';
import { useCopyData, printMemory } from '@/utils/tools';
import MyIcon from '@/components/Icon';
import styles from '../index.module.scss';
import dynamic from 'next/dynamic';
const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));
import { MOCK_APP_DETAIL } from '@/mock/apps';

const AppBaseInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const theme = useTheme();
  const { copyData } = useCopyData();
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
      }[];
    }[]
  >(
    () => [
      {
        name: '基本信息',
        iconName: 'formInfo',
        items: [
          { label: '创建时间', value: app.createTime },
          { label: `镜像名${app.secret.use ? '（私有）' : ''}`, value: app.imageName },
          { label: 'Limit CPU', value: `${app.cpu / 1000} Core` },
          {
            label: 'Limit Memory',
            value: printMemory(app.memory)
          }
        ]
      },
      {
        name: '部署模式',
        iconName: 'deployMode',
        items: app.hpa.use
          ? [
              { label: `${app.hpa.target}目标值`, value: `${app.hpa.value}%` },
              { label: '实例数', value: `${app.hpa.minReplicas} ~ ${app.hpa.maxReplicas}` }
            ]
          : [{ label: `固定实例数`, value: `${app.replicas}` }]
      }
    ],
    [app]
  );

  const appTags = useMemo(
    () => [
      ...(app.accessExternal.use ? ['可外网访问'] : []),
      ...(app.hpa.use ? ['弹性伸缩'] : ['固定实例']),
      ...(app.storeList.length > 0 ? ['有状态'] : ['无状态'])
    ],
    [app]
  );

  return (
    <Box px={6} py={7} position={'relative'}>
      <>
        <Flex alignItems={'center'} color={'myGray.500'}>
          <MyIcon w={'16px'} name={'appType'}></MyIcon>
          <Box ml={2}>应用类型</Box>
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
              {tag}
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
            <Box ml={2}>{info.name}</Box>
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
                  {item.label}
                </Box>
                <Box
                  color={'blackAlpha.600'}
                  flex={'1 0 0'}
                  textOverflow={'ellipsis'}
                  overflow={'hidden'}
                  whiteSpace={'nowrap'}
                >
                  <Tooltip label={item.value}>
                    <Box
                      as="span"
                      cursor={!!item.copy ? 'pointer' : 'default'}
                      onClick={() => item.value && !!item.copy && copyData(item.copy)}
                    >
                      {item.value}
                    </Box>
                  </Tooltip>
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>
      ))}
      <Box mt={6}>
        <Flex alignItems={'center'} color={'myGray.500'}>
          <MyIcon w={'16px'} name={'settings'}></MyIcon>
          <Box ml={2}>高级配置</Box>
        </Flex>
        <Box mt={2} pt={4} backgroundColor={'myWhite.400'} borderRadius={'sm'}>
          {[
            { label: '启动命令', value: app.runCMD || '未配置' },
            { label: '运行参数', value: app.cmdParam || '未配置' }
          ].map((item) => (
            <Flex
              key={item.label}
              _notFirst={{
                mt: 4
              }}
              px={4}
            >
              <Box flex={'0 0 80px'} w={0} color={'blackAlpha.800'}>
                {item.label}
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
                <Tooltip label={item.value}>{item.value}</Tooltip>
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
                  环境变量
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel py={0}>
                {app.envs.map((env) => (
                  <Flex key={env.key} mb={3}>
                    <Box flex={'0 0 110px'} w={0} color={'blackAlpha.800'}>
                      {env.key}
                    </Box>
                    <Box
                      color={'blackAlpha.600'}
                      flex={'1 0 0'}
                      textOverflow={'ellipsis'}
                      overflow={'hidden'}
                      whiteSpace={'nowrap'}
                      onClick={() => copyData(env.value)}
                      cursor={'pointer'}
                    >
                      <Tooltip label={env.value}>{env.value}</Tooltip>
                    </Box>
                  </Flex>
                ))}
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
                  configMap 配置文件
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
                  存储卷
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

export default AppBaseInfo;
