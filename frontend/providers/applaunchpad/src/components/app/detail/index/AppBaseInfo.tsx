import GPUItem from '@/components/GPUItem';
import MyIcon from '@/components/Icon';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useUserStore } from '@/store/user';
import type { AppDetailType } from '@/types/app';
import { printMemory, useCopyData } from '@/utils/tools';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  Flex,
  Tag,
  Text,
  useTheme
} from '@chakra-ui/react';
import { MyTooltip } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, { useMemo, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

const ConfigMapDetailModal = dynamic(() => import('./ConfigMapDetailModal'));

const AppBaseInfo = ({ app = MOCK_APP_DETAIL }: { app: AppDetailType }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { copyData } = useCopyData();
  const { userSourcePrice } = useUserStore();
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
              {
                label: `${app.hpa.target} ${t('target_value')}`,
                value: `${app.hpa.value}${app.hpa.target === 'gpu' ? '' : '%'}`
              },
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
      ...(app.networks.find((item) => item.openPublicDomain) ? ['Public Access'] : []),
      ...(app.hpa.use ? ['Auto scaling'] : ['Fixed instance']),
      ...(app.storeList.length > 0 ? ['Stateful'] : ['Stateless'])
    ],
    [app]
  );

  const persistentVolumes = useMemo(() => {
    return app.volumes
      .filter((item) => 'persistentVolumeClaim' in item)
      .reduce(
        (
          acc: {
            path: string;
            name: string;
          }[],
          volume
        ) => {
          const mount = app.volumeMounts.find((m) => m.name === volume.name);
          if (mount) {
            acc.push({
              path: mount.mountPath,
              name: volume.name
            });
          }
          return acc;
        },
        []
      );
  }, [app.volumes, app.volumeMounts]);

  return (
    <Box px={'32px'} py={'24px'} position={'relative'}>
      {appInfoTable.map((info, index) => (
        <Box key={info.name}>
          <Flex
            alignItems={'center'}
            color={'grayModern.900'}
            fontSize={'14px'}
            fontWeight={'bold'}
          >
            {t(info.name)}
          </Flex>
          <Box mt={'14px'}>
            {app?.source?.hasSource && index === 0 && (
              <Box fontSize={'12px'}>
                <Flex
                  flexWrap={'wrap'}
                  cursor={'pointer'}
                  onClick={() => {
                    if (!app?.source?.sourceName) return;
                    if (app.source.sourceType === 'app_store') {
                      sealosApp.runEvents('openDesktopApp', {
                        appKey: 'system-template',
                        pathname: '/instance',
                        query: { instanceName: app.source.sourceName }
                      });
                    }
                    if (app.source.sourceType === 'sealaf') {
                      sealosApp.runEvents('openDesktopApp', {
                        appKey: 'system-sealaf',
                        pathname: '/',
                        query: { instanceName: app.source.sourceName }
                      });
                    }
                  }}
                >
                  <Text flex={'0 0 110px'} w={0} color={'grayModern.600'}>
                    {t('application_source')}
                  </Text>
                  <Flex alignItems={'center'}>
                    <Text color={'grayModern.900'}>{t(app.source?.sourceType)}</Text>
                    <Divider
                      orientation="vertical"
                      h={'12px'}
                      mx={'8px'}
                      borderColor={'grayModern.300'}
                    />
                    <Box color={'grayModern.600'}>{t('Manage all resources')}</Box>
                    <MyIcon name="upperRight" width={'14px'} color={'grayModern.600'} />
                  </Flex>
                </Flex>
              </Box>
            )}
            {info.items.map((item, i) => (
              <Flex
                key={item.label || i}
                flexWrap={'wrap'}
                _notFirst={{
                  mt: '12px'
                }}
              >
                <Box flex={'0 0 110px'} w={0} color={'grayModern.600'} fontSize={'12px'}>
                  {t(item.label)}
                </Box>
                <Box
                  fontSize={'12px'}
                  color={'grayModern.900'}
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
          {index !== appInfoTable.length - 1 && <Divider my={'16px'} />}
        </Box>
      ))}

      {detailConfigMap && (
        <ConfigMapDetailModal {...detailConfigMap} onClose={() => setDetailConfigMap(undefined)} />
      )}
    </Box>
  );
};

export default React.memo(AppBaseInfo);
