import { getObjectStorageByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import useSessionStore from '@/store/session';
import { ObjectStorageItemType } from '@/types/objectStorage';
import { Box, Button, Center, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { refetchIntervalTime } from './appList';
import { StorageIcon } from '@/components/icons/Application';
import { EmptyBoxHeight } from './appList';

export default function ObjStorageList({ instanceName }: { instanceName: string }) {
  const { t } = useTranslation();
  const { appendResource } = useResourceStore();
  const { session } = useSessionStore();

  const { data } = useQuery(
    ['getObjectStorageByName', instanceName, session?.kubeconfig],
    () => getObjectStorageByName(instanceName),
    {
      refetchInterval: refetchIntervalTime,
      onSuccess(data) {
        appendResource(
          data.map((item) => {
            return { ...item, id: item.id, name: item.name };
          })
        );
      }
    }
  );
  const handleToDetailPage = useCallback((name: string) => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-objectstorage',
      pathname: '/',
      query: { name: name },
      messageData: { type: 'InternalAppCall', name: name }
    });
  }, []);

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof ObjectStorageItemType;
      key: string;
      render?: (item: ObjectStorageItemType) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: 'Name',
        key: 'name',
        render: (item: ObjectStorageItemType) => {
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
        render: (item: ObjectStorageItemType) => (
          <StatusTag status={item.status} showBorder={false} />
        )
      },
      {
        title: 'Creation Time',
        key: 'createTime',
        dataIndex: 'createTime'
      },
      {
        title: 'permission',
        key: 'policy',
        dataIndex: 'policy'
      },
      {
        title: 'Operation',
        key: 'control',
        render: (item: ObjectStorageItemType) => (
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
      <Flex alignItems={'center'} mt="48px">
        <StorageIcon />
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          {t('object_storage')}
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
