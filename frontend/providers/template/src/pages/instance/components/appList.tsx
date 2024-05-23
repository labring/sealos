import { getAppLaunchpadByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import useSessionStore from '@/store/session';
import { AppListItemType } from '@/types/launchpad';
import { printMemory } from '@/utils/tools';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

export const refetchIntervalTime = 3000;

export default function AppList({ instanceName }: { instanceName: string }) {
  const { t } = useTranslation();
  const { appendResource } = useResourceStore();
  const { session } = useSessionStore();

  const { data, isLoading } = useQuery(
    ['getAppLaunchpadByName', instanceName, session?.kubeconfig],
    () => getAppLaunchpadByName(instanceName),
    {
      refetchInterval: refetchIntervalTime,
      onSuccess(data) {
        appendResource(
          data.map((item) => {
            return { id: item.id, name: item.name, kind: 'AppLaunchpad' };
          })
        );
      }
    }
  );

  const handleToDetailPage = useCallback((name: string) => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-applaunchpad',
      pathname: '/app/detail',
      query: { name: name },
      messageData: { type: 'InternalAppCall', name: name }
    });
  }, []);

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof AppListItemType;
      key: string;
      render?: (item: AppListItemType) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: 'Name',
        key: 'name',
        render: (item: AppListItemType) => {
          return (
            <Box pl={4} color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.name}
            </Box>
          );
        }
      },
      {
        title: 'Status',
        key: 'status',
        render: (item: AppListItemType) => <StatusTag status={item.status} showBorder={false} />
      },
      {
        title: 'Creation Time',
        dataIndex: 'createTime',
        key: 'createTime'
      },
      {
        title: 'CPU',
        key: 'cpu',
        render: (item: AppListItemType) => <>{item.cpu / 1000}C</>
      },
      {
        title: 'Memory',
        key: 'memory',
        render: (item: AppListItemType) => <>{printMemory(item.memory)}</>
      },
      {
        title: 'Replicas',
        key: 'activeReplicas',
        render: (item: AppListItemType) => (
          <Flex whiteSpace={'nowrap'}>
            <Box color={'myGray.900'}>
              {t('Active')}: {item.activeReplicas}
            </Box>
            {item.minReplicas !== item.maxReplicas && (
              <Box>
                &ensp;/&ensp;{t('Total')}: {item.minReplicas}-{item.maxReplicas}
              </Box>
            )}
          </Flex>
        )
      },
      {
        title: 'Storage',
        key: 'store',
        render: (item: AppListItemType) => (
          <>{item.storeAmount > 0 ? `${item.storeAmount}Gi` : '-'}</>
        )
      },
      {
        title: 'Operation',
        key: 'control',
        render: (item: AppListItemType) => (
          <Flex>
            <Button
              mr={5}
              variant={'base'}
              leftIcon={<MyIcon name={'detail'} transform={'translateY(-1px)'} />}
              px={3}
              onClick={() => handleToDetailPage(item.name)}
            >
              {t('Details')}
            </Button>
          </Flex>
        )
      }
    ],
    [handleToDetailPage, t]
  );

  return (
    <>
      <Flex alignItems={'center'}>
        <Icon width="24px" height="24px" viewBox="0 0 24 24" fill="#363C42">
          <path d="M21.999 18.676L17.567 16.12L12.784 18.884V24L21.999 18.676ZM11.216 24V18.881L6.43099 16.119L2.00099 18.676L11.216 24ZM11.995 17.525L16.784 14.76V9.236L11.999 6.476L7.21599 9.236V14.763L11.997 17.524L11.995 17.525ZM1.21999 6.682V17.323L5.65199 14.764V9.239L1.21899 6.68L1.21999 6.682ZM20.835 7.803L18.351 9.239V14.761L22.781 17.32V6.678L20.835 7.803ZM2.00099 5.324L6.43599 7.883L11.217 5.121V0.003L2.00099 5.324ZM17.567 7.883L22.001 5.324L12.782 0V5.121L17.567 7.883Z" />
        </Icon>
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          App Launchpad
        </Text>
      </Flex>
      <Box backgroundColor={'#F3F4F5'} mt="16px">
        {data && data?.length > 0 ? (
          <MyTable itemClass="appItem" columns={columns} data={data} />
        ) : (
          <Flex
            flexDirection={'column'}
            justifyContent={'center'}
            alignItems={'center'}
            background={'white'}
            p="32px"
          >
            <Flex
              border={'1px dashed #9CA2A8'}
              borderRadius="50%"
              w={'48px'}
              h={'48px'}
              justifyContent="center"
              alignItems={'center'}
            >
              <MyIcon color={'#7B838B'} name="empty"></MyIcon>
            </Flex>
            <Text mt={'12px'} fontSize={14} color={'#5A646E'}>
              {t('There is no resource of this type')}
            </Text>
          </Flex>
        )}
      </Box>
    </>
  );
}
