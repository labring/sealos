import { getCronListByName } from '@/api/instance';
import StatusTag from '@/components/StatusTag';
import MyIcon from '@/components/Icon';
import MyTable from '@/components/Table';
import { CronJobListItemType } from '@/types/cronJob';
import { Box, Button, Center, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo } from 'react';
import { useResourceStore } from '@/store/resource';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { refetchIntervalTime } from './appList';
import useSessionStore from '@/store/session';
import { CronjobIcon } from '@/components/icons/Application';
import { EmptyBoxHeight } from './appList';

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
        <CronjobIcon />
        <Text ml="12px" fontWeight={500} fontSize={'18px'} color={'#363C42'}>
          {t('cronjob')}
        </Text>
      </Flex>
      <Box backgroundColor={'#F3F4F5'} mt="16px">
        {data && data.length > 0 ? (
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
