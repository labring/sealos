import { getDBListByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import { DBListItemType } from '@/types/db';
import { printMemory } from '@/utils/tools';
import { Box, Button, Center, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { refetchIntervalTime } from './appList';
import useSessionStore from '@/store/session';
import { DBIcon } from '@/components/icons/Application';
import { EmptyBoxHeight } from './appList';

export default function AppList({ instanceName }: { instanceName: string }) {
  const { t } = useTranslation();
  const { appendResource } = useResourceStore();
  const { session } = useSessionStore();

  const { data } = useQuery(
    ['getDBListByName', instanceName, session?.kubeconfig],
    () => getDBListByName(instanceName),
    {
      refetchInterval: refetchIntervalTime,
      onSuccess(data) {
        appendResource(
          data.map((item) => {
            return { id: item.id, name: item.name, kind: 'DataBase' };
          })
        );
      }
    }
  );

  const handleToDetailPage = (item: DBListItemType) => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-dbprovider',
      pathname: '/redirect',
      query: { name: item.name },
      messageData: { type: 'InternalAppCall', name: item.name }
    });
  };

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof DBListItemType;
      key: string;
      render?: (item: DBListItemType) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: 'Name',
        key: 'name',
        render: (item: DBListItemType) => {
          return (
            <Box pl={4} color={'myGray.900'} fontSize={'md'}>
              {item.name}
            </Box>
          );
        }
      },
      {
        title: 'Status',
        key: 'status',
        render: (item: DBListItemType) => <StatusTag status={item.status} showBorder={false} />
      },
      {
        title: 'Type',
        key: 'dbType',
        render: (item: DBListItemType) => <>{item.dbType}</>
      },
      {
        title: 'Creation Time',
        dataIndex: 'createTime',
        key: 'createTime'
      },
      {
        title: 'CPU',
        key: 'cpu',
        render: (item: DBListItemType) => <>{item.cpu / 1000}C</>
      },
      {
        title: 'Memory',
        key: 'memory',
        render: (item: DBListItemType) => <>{printMemory(item.memory)}</>
      },
      {
        title: 'Storage',
        key: 'storage',
        dataIndex: 'storage'
      },
      {
        title: 'Operation',
        key: 'control',
        render: (item: DBListItemType) => (
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
              onClick={() => handleToDetailPage(item)}
            >
              {t('Details')}
            </Button>
          </Flex>
        )
      }
    ],
    [t]
  );

  return (
    <Box>
      <Flex alignItems={'center'} mt="48px">
        <DBIcon />
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          {t('database')}
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
