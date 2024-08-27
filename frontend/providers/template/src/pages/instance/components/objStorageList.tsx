import { getObjectStorageByName } from '@/api/instance';
import MyIcon from '@/components/Icon';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { useResourceStore } from '@/store/resource';
import useSessionStore from '@/store/session';
import { ObjectStorageItemType } from '@/types/objectStorage';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { refetchIntervalTime } from './appList';

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
      <Flex alignItems={'center'} mt="48px">
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="24px"
          height="25px"
          viewBox="0 0 24 25"
          fill="none"
        >
          <path
            d="M19.601 15.3506C19.8505 15.3506 20.0976 15.3998 20.3282 15.4952C20.5587 15.5907 20.7682 15.7307 20.9446 15.9071C21.121 16.0836 21.261 16.293 21.3565 16.5236C21.452 16.7541 21.5011 17.0012 21.5011 17.2507V20.1008C21.5011 20.3504 21.452 20.5974 21.3565 20.828C21.261 21.0585 21.121 21.268 20.9446 21.4444C20.7682 21.6208 20.5587 21.7608 20.3282 21.8563C20.0976 21.9518 19.8505 22.0009 19.601 22.0009H4.40028C4.15075 22.0009 3.90367 21.9518 3.67314 21.8563C3.44261 21.7608 3.23315 21.6208 3.05671 21.4444C2.88027 21.268 2.74031 21.0585 2.64482 20.828C2.54933 20.5974 2.50018 20.3504 2.50018 20.1008V17.2507C2.50018 17.0012 2.54933 16.7541 2.64482 16.5236C2.74031 16.293 2.88027 16.0836 3.05671 15.9071C3.23315 15.7307 3.44261 15.5907 3.67314 15.4952C3.90367 15.3998 4.15075 15.3506 4.40028 15.3506H19.601ZM13.5207 17.9157H10.4806C10.279 17.9157 10.0857 17.9958 9.94315 18.1383C9.80061 18.2809 9.72054 18.4742 9.72054 18.6758C9.72054 18.8773 9.80061 19.0707 9.94315 19.2132C10.0857 19.3557 10.279 19.4358 10.4806 19.4358H13.5207C13.7223 19.4358 13.9156 19.3557 14.0582 19.2132C14.2007 19.0707 14.2808 18.8773 14.2808 18.6758C14.2808 18.4742 14.2007 18.2809 14.0582 18.1383C13.9156 17.9958 13.7223 17.9157 13.5207 17.9157ZM19.601 7.75023C19.8505 7.75023 20.0976 7.79938 20.3282 7.89487C20.5587 7.99036 20.7682 8.13032 20.9446 8.30676C21.121 8.4832 21.261 8.69266 21.3565 8.92319C21.452 9.15372 21.5011 9.4008 21.5011 9.65033V12.5005C21.5011 12.75 21.452 12.9971 21.3565 13.2276C21.261 13.4581 21.121 13.6676 20.9446 13.844C20.7682 14.0205 20.5587 14.1604 20.3282 14.2559C20.0976 14.3514 19.8505 14.4006 19.601 14.4006H4.40028C4.15075 14.4006 3.90367 14.3514 3.67314 14.2559C3.44261 14.1604 3.23315 14.0205 3.05671 13.844C2.88027 13.6676 2.74031 13.4581 2.64482 13.2276C2.54933 12.9971 2.50018 12.75 2.50018 12.5005V9.65033C2.50018 9.4008 2.54933 9.15372 2.64482 8.92319C2.74031 8.69266 2.88027 8.4832 3.05671 8.30676C3.23315 8.13032 3.44261 7.99036 3.67314 7.89487C3.90367 7.79938 4.15075 7.75023 4.40028 7.75023H19.601ZM13.5207 10.3154H10.4806C10.279 10.3154 10.0857 10.3954 9.94315 10.538C9.80061 10.6805 9.72054 10.8738 9.72054 11.0754C9.72054 11.277 9.80061 11.4703 9.94315 11.6128C10.0857 11.7554 10.279 11.8354 10.4806 11.8354H13.5207C13.7223 11.8354 13.9156 11.7554 14.0582 11.6128C14.2007 11.4703 14.2808 11.277 14.2808 11.0754C14.2808 10.8738 14.2007 10.6805 14.0582 10.538C13.9156 10.3954 13.7223 10.3154 13.5207 10.3154ZM7.66559 3H16.3357C16.6144 2.99997 16.8896 3.06122 17.142 3.17944C17.3943 3.29765 17.6176 3.46992 17.7959 3.68403L19.601 5.85014H4.40028L6.20537 3.68403C6.38371 3.46992 6.60697 3.29765 6.85932 3.17944C7.11166 3.06122 7.38692 2.99997 7.66559 3Z"
            fill="#363C42"
          />
        </Icon>
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          {t('object_storage')}
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
