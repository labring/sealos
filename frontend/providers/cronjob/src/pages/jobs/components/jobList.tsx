import { updateCronJobStatus, implementJob } from '@/api/job';
import MyIcon from '@/components/Icon';
import MyMenu from '@/components/Menu';
import StatusTag from '@/components/StatusTag';
import MyTable from '@/components/Table';
import { StatusEnum } from '@/constants/job';
import { useConfirm } from '@/hooks/useConfirm';
import { useCronJobOperation } from '@/hooks/useCronJobOperation';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import useEnvStore from '@/store/env';
import { CronJobListItemType } from '@/types/job';
import { Box, Button, Flex, MenuButton, useTheme } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useQuotaGuarded } from '@sealos/shared';

const DelModal = dynamic(() => import('@/pages/job/detail/components/DelModal'));
const ErrorModal = dynamic(() => import('@/components/ErrorModal'));

const JobList = ({
  list = [],
  refetchApps
}: {
  list: CronJobListItemType[];
  refetchApps: () => void;
}) => {
  const { t } = useTranslation();
  const { setLoading } = useGlobalStore();
  const {
    executeOperation,
    loading: operationLoading,
    errorModalState,
    closeErrorModal
  } = useCronJobOperation();
  const theme = useTheme();
  const router = useRouter();
  const [delAppName, setDelAppName] = useState('');
  const { SystemEnv } = useEnvStore();

  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: t('Pause Hint')
  });

  const handleCreateApp = useQuotaGuarded(
    {
      requirements: {
        cpu: SystemEnv.podCpuRequest,
        memory: SystemEnv.podMemoryRequest,
        traffic: true
      },
      immediate: false,
      allowContinue: true
    },
    () => {
      router.push('/job/edit');
    }
  );

  const handlePauseApp = useCallback(
    async (job: CronJobListItemType, type: 'Stop' | 'Start') => {
      await executeOperation(() => updateCronJobStatus({ jobName: job.name, type: type }), {
        successMessage: type === 'Stop' ? t('job_paused') : t('job_started'),
        errorMessage: type === 'Stop' ? t('job_pause_error') : t('job_start_error'),
        onSuccess: () => refetchApps()
      });
    },
    [executeOperation, refetchApps, t]
  );
  const handleImplementJob = useCallback(
    async (job: CronJobListItemType) => {
      const result = await executeOperation(() => implementJob({ jobName: job.name }), {
        successMessage: t('job_implement_success'),
        errorMessage: t('operation_failed')
      });
      if (result !== null) {
        router.replace(`/job/detail?name=${job.name}`);
        refetchApps();
      }
    },
    [executeOperation, refetchApps, router, t]
  );

  const columns: {
    title: string;
    dataIndex?: keyof CronJobListItemType;
    key: string;
    render?: (item: CronJobListItemType) => JSX.Element;
  }[] = [
    {
      title: 'Name',
      key: 'name',
      render: (item: CronJobListItemType) => {
        return (
          <Box pl={4} color={'myGray.900'} fontWeight={500} fontSize={'md'}>
            {item.name}
          </Box>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (item: CronJobListItemType) => <StatusTag status={item.status} />
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule'
    },
    {
      title: 'Next Execution Time',
      dataIndex: 'nextExecutionTime',
      key: 'nextExecutionTime'
    },
    {
      title: 'Last Schedule',
      key: 'lastScheduleTime',
      render: (item: CronJobListItemType) => (
        <Flex flexDirection={'column'} minW={'220px'}>
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
            onClick={() => router.push(`/job/detail?name=${item.name}`)}
          >
            {t('Details')}
          </Button>
          <MyMenu
            width={100}
            Button={
              <MenuButton
                w={'32px'}
                h={'32px'}
                borderRadius={'sm'}
                _hover={{
                  bg: 'myWhite.400',
                  color: 'hover.iconBlue'
                }}
              >
                <MyIcon name={'more'} px={3} />
              </MenuButton>
            }
            menuList={[
              {
                child: (
                  <>
                    <MyIcon name={'continue'} w={'14px'} />
                    <Box ml={2}>{t('implement')}</Box>
                  </>
                ),
                onClick: () => handleImplementJob(item)
              },
              ...(item.status.value === StatusEnum.Stopped
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'continue'} w={'14px'} />
                          <Box ml={2}>{t('Continue')}</Box>
                        </>
                      ),
                      onClick: () => handlePauseApp(item, 'Start')
                    }
                  ]
                : [
                    {
                      child: (
                        <>
                          <MyIcon name={'change'} w={'14px'} />
                          <Box ml={2}>{t('Update')}</Box>
                        </>
                      ),
                      onClick: () => router.push(`/job/edit?name=${item.name}`)
                    }
                  ]),
              ...(item.status.value === StatusEnum.Running
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'pause'} w={'14px'} />
                          <Box ml={2}>{t('Pause')}</Box>
                        </>
                      ),
                      onClick: onOpenPause(() => handlePauseApp(item, 'Stop'))
                    }
                  ]
                : []),
              {
                child: (
                  <>
                    <MyIcon name={'delete'} w={'12px'} />
                    <Box ml={2}>{t('Delete')}</Box>
                  </>
                ),
                onClick: () => setDelAppName(item.name)
              }
            ]}
          />
        </Flex>
      )
    }
  ];

  return (
    <Box bg={'#F3F4F5'} px={'34px'} minH="100vh">
      <Flex h={'88px'} alignItems={'center'}>
        <Box mr={4} p={2} backgroundColor={'#FEFEFE'} border={theme.borders.sm} borderRadius={'sm'}>
          <MyIcon name="logo" w={'24px'} h={'24px'} />
        </Box>
        <Box fontSize={'18px'} fontWeight={500} color={'black'}>
          {t('job.list')}
        </Box>
        <Box ml={3} color={'gray.500'}>
          ( {list.length} )
        </Box>
        <Box flex={1}></Box>
        <Button
          flex={'0 0 155px'}
          h={'40px'}
          colorScheme={'primary'}
          leftIcon={<MyIcon name={'plus'} w={'12px'} />}
          variant={'primary'}
          onClick={handleCreateApp}
        >
          {t('job.create')}
        </Button>
      </Flex>
      <MyTable columns={columns} data={list} />
      <PauseChild />
      {!!delAppName && (
        <DelModal jobName={delAppName} onClose={() => setDelAppName('')} onSuccess={refetchApps} />
      )}
      {errorModalState.visible && (
        <ErrorModal
          title={errorModalState.title}
          content={errorModalState.content}
          errorCode={errorModalState.errorCode}
          onClose={closeErrorModal}
        />
      )}
    </Box>
  );
};

export default JobList;
