import { getCronListByName } from '@/api/instance';
import StatusTag from '@/components/StatusTag';
import MyIcon from '@/components/Icon';
import MyTable from '@/components/Table';
import { CronJobListItemType } from '@/types/cronJob';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo } from 'react';
import { useResourceStore } from '@/store/resource';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { refetchIntervalTime } from './appList';
import useSessionStore from '@/store/session';

export default function CronJobList({ instanceName }: { instanceName: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { appendResource } = useResourceStore();
  const { session } = useSessionStore();

  const { data } = useQuery(
    ['getCronListByName', instanceName, session?.kubeconfig],
    () => getCronListByName(instanceName),
    {
      refetchInterval: refetchIntervalTime,
      onSuccess(data) {
        appendResource(
          data.map((item) => {
            return { id: item.id, name: item.name, kind: 'CronJob' };
          })
        );
      }
    }
  );
  const handleToDetailPage = useCallback((name: string) => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-cronjob',
      pathname: '/job/detail',
      query: { name: name },
      messageData: { type: 'InternalAppCall', name: name }
    });
  }, []);

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof CronJobListItemType;
      key: string;
      render?: (item: CronJobListItemType) => JSX.Element;
    }[]
  >(
    () => [
      {
        title: 'Name',
        key: 'name',
        render: (item: CronJobListItemType) => {
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
        render: (item: CronJobListItemType) => <StatusTag status={item.status} showBorder={false} />
      },
      {
        title: 'Schedule',
        key: 'schedule',
        dataIndex: 'schedule'
        // render: (item: CronJobListItemType) => <Box  >{item.schedule}</Box>
      },
      {
        title: 'Next Execution Time',
        key: 'nextExecutionTime',
        dataIndex: 'nextExecutionTime'
        // render: (item: CronJobListItemType) => <Box minW={'220px'}>{item.nextExecutionTime}</Box>
      },
      {
        title: 'Last Schedule',
        key: 'lastScheduleTime',
        render: (item: CronJobListItemType) => (
          <Flex flexDirection={'column'} minW={'200px'}>
            <Box>
              {t('Last Schedule Time')} {item.lastScheduleTime}
            </Box>
            <Box>
              {t('Last Successful Time')} {item.lastSuccessfulTime}
            </Box>
          </Flex>
        )
      },
      {
        title: 'Operation',
        key: 'control',
        render: (item: CronJobListItemType) => (
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
        <Icon width="24px" height="24px" viewBox="0 0 24 24" fill="#363C42">
          <path d="M10.021 1.021H16.021V3.021H10.021V1.021ZM20.04 7.41L21.474 5.976L20.06 4.562L18.627 5.995C17.0569 4.73681 15.1101 4.04175 13.0982 4.02109C11.0863 4.00042 9.12562 4.65533 7.53001 5.881L8.95001 7.321C10.1364 6.47836 11.5548 6.02418 13.01 6.021L13.02 6.022V13.002L17.973 17.96C16.9952 18.9424 15.7478 19.6124 14.3888 19.8852C13.0299 20.158 11.6205 20.0212 10.3393 19.4923C9.05817 18.9634 7.96283 18.066 7.19211 16.914C6.4214 15.7619 6.00999 14.4071 6.01001 13.021H9.01001L5.01001 9.021L1.01001 13.021H4.01001C4.00865 14.4592 4.35195 15.8767 5.01117 17.1549C5.67038 18.4331 6.62631 19.5347 7.79887 20.3674C8.97143 21.2001 10.3265 21.7397 11.7505 21.9409C13.1745 22.1422 14.626 21.9993 15.9834 21.5242C17.3408 21.049 18.5646 20.2555 19.5522 19.2101C20.5398 18.1647 21.2626 16.8978 21.6598 15.5156C22.0571 14.1334 22.1173 12.6761 21.8355 11.2658C21.5537 9.85556 20.938 8.53336 20.04 7.41Z" />
        </Icon>
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          CronJob
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
