import { getAppLaunchpadByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import { AppLaunchpadIcon } from '@/components/icons/Application';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import useSessionStore from '@/store/session';
import { AppListItemType } from '@/types/launchpad';
import { printMemory } from '@/utils/tools';
import { Box, Button, Center, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

export const EmptyBoxHeight = '60px';
export const refetchIntervalTime = 10 * 1000;

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
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{
                color: 'brightBlue.600'
              }}
              h={'32px'}
              leftIcon={<MyIcon name={'detail'} transform={'translateY(-1px)'} />}
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
    <Box>
      <Flex alignItems={'center'}>
        <AppLaunchpadIcon />
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          {t('launchpad')}
        </Text>
      </Flex>
      <Box backgroundColor={'#F3F4F5'} mt="16px">
        {data && data?.length > 0 ? (
          <MyTable itemClass="appItem" columns={columns} data={data} />
        ) : (
          <Center background={'white'} h={EmptyBoxHeight} borderRadius={'6px'}>
            <Text fontSize={'12px'} color={'grayModern.500'}>
              {t('no_resource_type')}
            </Text>
          </Center>
        )}
      </Box>
    </Box>
  );
}
