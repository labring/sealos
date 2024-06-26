import { getDBListByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import { DBListItemType } from '@/types/db';
import { printMemory } from '@/utils/tools';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { refetchIntervalTime } from './appList';
import useSessionStore from '@/store/session';

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

  const handleToDetailPage = (name: string) => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-dbprovider',
      pathname: '/db/detail',
      query: { name: name },
      messageData: { type: 'InternalAppCall', name: name }
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
    [t]
  );

  return (
    <>
      <Flex alignItems={'center'} mt="48px">
        <Icon width="24px" height="24px" viewBox="0 0 24 24" fill="#363C42">
          <path d="M19.6281 18.2208C19.6281 20.3281 16.2126 22.0348 12.0001 22.0348C7.78751 22.0348 4.37207 20.3281 4.37207 18.2208V14.3821C4.85073 14.9704 5.53057 15.4586 6.2867 15.8361C7.7856 16.5856 9.80702 17.029 12.0001 17.029C14.1931 17.029 16.2145 16.5856 17.7134 15.8371C18.4696 15.4586 19.1494 14.9694 19.6281 14.3821V18.2208Z" />
          <path d="M12.0001 11.308C14.1931 11.308 16.2145 10.8646 17.7134 10.1161C18.4696 9.73755 19.1494 9.24841 19.6281 8.66105V12.4998C19.6281 12.9766 17.9251 14.0169 17.0736 14.5575C15.8122 15.1878 14.0196 15.5987 12.0001 15.5987C9.98056 15.5987 8.18798 15.1887 6.9265 14.5575C5.80232 13.9949 4.37207 12.9766 4.37207 12.4998V8.66105C4.85073 9.24936 5.53057 9.73755 6.2867 10.1151C7.7856 10.8646 9.80702 11.308 12.0001 11.308Z" />
          <path d="M17.0736 8.8365C15.8122 9.46676 14.0196 9.87772 12.0001 9.87772C9.98056 9.87772 8.18798 9.46771 6.9265 8.8365C6.43544 8.64389 5.33129 8.0327 4.56372 7.04487C4.49916 6.96183 4.45225 6.86647 4.42585 6.76465C4.39945 6.66283 4.39413 6.5567 4.41021 6.45275C4.43214 6.31163 4.46265 6.16574 4.50175 6.07516C5.16157 4.30546 8.26807 2.96484 12.0001 2.96484C15.7321 2.96484 18.8386 4.30546 19.4984 6.07516C19.5375 6.16574 19.568 6.31163 19.5899 6.45275C19.6059 6.55676 19.6004 6.66294 19.5738 6.76476C19.5473 6.86658 19.5002 6.9619 19.4355 7.04487C18.6688 8.0327 17.5647 8.64389 17.0736 8.8365Z" />
        </Icon>
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          DataBase
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
