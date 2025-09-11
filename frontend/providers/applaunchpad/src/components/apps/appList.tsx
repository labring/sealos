import { pauseAppByName, restartAppByName, startAppByName, setAppRemark } from '@/api/app';
import { getWorkspaceSubscriptionInfo } from '@/api/platform';
import AppStatusTag from '@/components/AppStatusTag';
import GPUItem from '@/components/GPUItem';
import MyIcon from '@/components/Icon';
import { MyTooltip, SealosMenu } from '@sealos/ui';
import PodLineChart from '@/components/PodLineChart';
import { MyTable } from '@sealos/ui';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';
import { AppListItemType } from '@/types/app';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { getErrText } from '@/utils/tools';
import {
  Box,
  Text,
  Button,
  Center,
  Flex,
  MenuButton,
  useTheme,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ThemeType } from '@sealos/ui';
import UpdateModal from '@/components/app/detail/index/UpdateModal';
import { useGuideStore } from '@/store/guide';
import { applistDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { PencilLine } from 'lucide-react';
import { track } from '@sealos/gtm';

const DelModal = dynamic(() => import('@/components/app/detail/index/DelModal'));

const AppList = ({
  apps = [],
  refetchApps
}: {
  apps: AppListItemType[];
  refetchApps: () => void;
}) => {
  const { t } = useTranslation();
  const { setLoading } = useGlobalStore();
  const { userSourcePrice, loadUserQuota, checkExceededQuotas } = useUserStore();
  const { toast } = useToast();
  const theme = useTheme<ThemeType>();
  const router = useRouter();
  const [delAppName, setDelAppName] = useState('');
  const [updateAppName, setUpdateAppName] = useState('');
  const [remarkAppName, setRemarkAppName] = useState('');
  const [remarkValue, setRemarkValue] = useState('');
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  // Fetch workspace subscription info
  const { data: subscriptionInfo } = useQuery({
    queryKey: ['workspaceSubscriptionInfo'],
    queryFn: () => getWorkspaceSubscriptionInfo(),
    refetchOnWindowFocus: false,
    retry: 1
  });

  // load user quota on component mount
  useEffect(() => {
    if (quotaLoaded) return;

    loadUserQuota();
    setQuotaLoaded(true);
  }, [quotaLoaded, loadUserQuota]);

  const { openConfirm: onOpenPause, ConfirmChild: PauseChild } = useConfirm({
    content: 'pause_message'
  });
  const {
    isOpen: isOpenUpdateModal,
    onOpen: onOpenUpdateModal,
    onClose: onCloseUpdateModal
  } = useDisclosure();

  const {
    isOpen: isOpenRemarkModal,
    onOpen: onOpenRemarkModal,
    onClose: onCloseRemarkModal
  } = useDisclosure();

  const handleOpenRemarkModal = useCallback(
    (appName: string) => {
      const app = apps.find((app) => app.name === appName);
      setRemarkAppName(appName);
      setRemarkValue(app?.remark || '');
      onOpenRemarkModal();
    },
    [apps, onOpenRemarkModal]
  );

  const handleSaveRemark = useCallback(async () => {
    try {
      setLoading(true);
      const app = apps.find((app) => app.name === remarkAppName);
      const kind = app?.kind || 'deployment';

      await setAppRemark({
        appName: remarkAppName,
        remark: remarkValue,
        kind
      });

      toast({
        title: t('remark_updated_successfully'),
        status: 'success'
      });

      refetchApps();
    } catch (error: any) {
      toast({
        title: t(getErrText(error), 'update_remark_failed'),
        status: 'error'
      });
      console.error(error);
    } finally {
      setLoading(false);
      onCloseRemarkModal();
      setRemarkAppName('');
      setRemarkValue('');
    }
  }, [apps, remarkAppName, remarkValue, setLoading, toast, t, refetchApps, onCloseRemarkModal]);

  const handleCreateApp = useCallback(() => {
    // Check quota before creating app
    const exceededQuotaItems = checkExceededQuotas({
      cpu: 1,
      memory: 1,
      nodeport: 1,
      storage: 1,
      ...(subscriptionInfo?.subscription?.type === 'PAYG' ? {} : { traffic: 1 })
    });

    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      track('deployment_start', {
        module: 'applaunchpad'
      });
      router.push('/app/edit');
    }
  }, [checkExceededQuotas, router, subscriptionInfo?.subscription?.type]);

  const handleRestartApp = useCallback(
    async (appName: string) => {
      try {
        setLoading(true);
        await restartAppByName(appName);
        toast({
          title: `${t('Restart Success')}`,
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: t(getErrText(error), 'Restart Failed'),
          status: 'error'
        });
        console.error(error, '==');
      }
      setLoading(false);
    },
    [setLoading, t, toast]
  );

  const handlePauseApp = useCallback(
    async (appName: string) => {
      try {
        setLoading(true);
        await pauseAppByName(appName);
        toast({
          title: t('Application paused'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: t(getErrText(error), 'Pause Failed'),
          status: 'error'
        });
        console.error(error);
      }
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

  const handleStartApp = useCallback(
    async (appName: string) => {
      try {
        setLoading(true);
        await startAppByName(appName);
        toast({
          title: t('Start Successful'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: t(getErrText(error), 'Start Failed'),
          status: 'error'
        });
        console.error(error);
      }
      setLoading(false);
      refetchApps();
    },
    [refetchApps, setLoading, t, toast]
  );

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
        title: t('Name'),
        key: 'name',
        render: (item: AppListItemType) => {
          const tooltipContent = (
            <Box>
              <Text>{item.name}</Text>
              {item.remark && (
                <Text fontSize="sm" mt={1}>
                  {item.remark}
                </Text>
              )}
            </Box>
          );

          return (
            <Flex
              cursor={'pointer'}
              pl={4}
              fontSize={'14px'}
              fontWeight={'500'}
              alignItems={item?.remark ? 'flex-start' : 'center'}
              _hover={{
                '& .remark-button': {
                  opacity: 1,
                  visibility: 'visible'
                },
                '& .app-name': {
                  maxWidth: '100px'
                }
              }}
              flexDirection={item?.remark ? 'column' : 'row'}
              gap={item?.remark ? '4px' : 0}
            >
              <Flex alignItems="center" width="100%">
                <Text
                  className="app-name"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title=""
                  maxWidth="150px"
                  transition="max-width 0.2s"
                >
                  {item.name}
                </Text>

                {!item.remark && (
                  <Center
                    className="remark-button"
                    gap={'4px'}
                    color={'#737373'}
                    opacity={0}
                    visibility="hidden"
                    transition="all 0.2s"
                    flexShrink={0}
                    ml={2}
                    onClick={() => handleOpenRemarkModal(item.name)}
                  >
                    <PencilLine size={16} />
                    <Text fontSize={'14px'} fontWeight={'400'} whiteSpace="nowrap">
                      {t('set_remarks')}
                    </Text>
                  </Center>
                )}
              </Flex>
              {item.remark && (
                <Flex alignItems="center" width="100%">
                  <Text
                    className="app-name"
                    fontSize={'12px'}
                    color={'#737373'}
                    flex={1}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    title=""
                    maxWidth="150px"
                    transition="max-width 0.2s"
                  >
                    {item.remark}
                  </Text>

                  <Center
                    className="remark-button"
                    gap={'4px'}
                    color={'#737373'}
                    opacity={0}
                    visibility="hidden"
                    transition="all 0.2s"
                    flexShrink={0}
                    ml={2}
                    onClick={() => handleOpenRemarkModal(item.name)}
                  >
                    <PencilLine size={16} />
                    <Text fontSize={'14px'} fontWeight={'400'} whiteSpace="nowrap">
                      {t('set_remarks')}
                    </Text>
                  </Center>
                </Flex>
              )}
            </Flex>
          );
        }
      },
      {
        title: t('Status'),
        key: 'status',
        render: (item: AppListItemType) => (
          <AppStatusTag status={item.status} isPause={item.isPause} showBorder={false} />
        )
      },
      {
        title: t('Creation Time'),
        dataIndex: 'createTime',
        key: 'createTime'
      },
      {
        title: t('CPU'),
        key: 'cpu',
        render: (item: AppListItemType) => (
          <Box h={'35px'} w={['120px', '130px', '140px']}>
            <Box h={'35px'} w={['120px', '130px', '140px']} position={'absolute'}>
              <PodLineChart type="blue" data={item.usedCpu} />
              <Text
                color={'#0077A9'}
                fontSize={'sm'}
                fontWeight={'bold'}
                position={'absolute'}
                right={'4px'}
                bottom={'0px'}
                pointerEvents={'none'}
                textShadow="1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF"
              >
                {item?.usedCpu?.yData[item?.usedCpu?.yData?.length - 1]}%
              </Text>
            </Box>
          </Box>
        )
      },
      {
        title: t('Memory'),
        key: 'storage',
        render: (item: AppListItemType) => (
          <Box h={'35px'} w={['120px', '130px', '140px']}>
            <Box h={'35px'} w={['120px', '130px', '140px']} position={'absolute'}>
              <PodLineChart type="purple" data={item.usedMemory} />
              <Text
                color={'#6F5DD7'}
                fontSize={'sm'}
                fontWeight={'bold'}
                position={'absolute'}
                right={'4px'}
                bottom={'0px'}
                pointerEvents={'none'}
                textShadow="1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF"
              >
                {item?.usedMemory?.yData[item?.usedMemory?.yData?.length - 1]}%
              </Text>
            </Box>
          </Box>
        )
      },
      ...(userSourcePrice?.gpu
        ? [
            {
              title: t('GPU'),
              key: 'gpu',
              render: (item: AppListItemType) => <GPUItem gpu={item.gpu} />
            }
          ]
        : []),
      {
        title: t('Replicas'),
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
        title: t('Storage'),
        key: 'store',
        render: (item: AppListItemType) => (
          <>{item.storeAmount > 0 ? `${item.storeAmount}Gi` : '-'}</>
        )
      },
      {
        title: t('Operation'),
        key: 'control',
        render: (item: AppListItemType) => (
          <Flex>
            <Button
              mr={5}
              height={'32px'}
              size={'sm'}
              fontSize={'base'}
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{
                color: 'brightBlue.600'
              }}
              leftIcon={<MyIcon name={'detail'} w={'16px'} h="16px" />}
              onClick={() => router.push(`/app/detail?name=${item.name}`)}
            >
              {t('Details')}
            </Button>
            <SealosMenu
              width={100}
              Button={
                <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                  <MyIcon name={'more'} px={3} />
                </MenuButton>
              }
              menuList={[
                ...(item.isPause
                  ? [
                      {
                        child: (
                          <>
                            <MyIcon name={'continue'} w={'16px'} />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Start Up')}
                            </Box>
                          </>
                        ),
                        onClick: () => handleStartApp(item.name)
                      }
                    ]
                  : [
                      {
                        child: (
                          <>
                            <MyIcon name={'pause'} w={'16px'} />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Pause')}
                            </Box>
                          </>
                        ),
                        onClick: onOpenPause(() => handlePauseApp(item.name))
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'change'} w={'16px'} />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Update')}
                            </Box>
                          </>
                        ),
                        onClick: () => {
                          if (item.source.hasSource && item.source.sourceType === 'sealaf') {
                            setUpdateAppName(item.name);
                            onOpenUpdateModal();
                          } else {
                            router.push(`/app/edit?name=${item.name}`);
                          }
                        }
                      },
                      {
                        child: (
                          <>
                            <MyIcon name={'restart'} w="16px" />
                            <Box ml={2} fontWeight={'bold'}>
                              {t('Restart')}
                            </Box>
                          </>
                        ),
                        onClick: () => handleRestartApp(item.name)
                      }
                    ]),

                {
                  child: (
                    <>
                      <MyIcon name={'delete'} w={'16px'} />
                      <Box ml={2} fontWeight={'bold'}>
                        {t('Delete')}
                      </Box>
                    </>
                  ),
                  menuItemStyle: {
                    _hover: {
                      color: 'red.600',
                      bg: 'rgba(17, 24, 36, 0.05)'
                    }
                  },
                  onClick: () => setDelAppName(item.name)
                }
              ]}
            />
          </Flex>
        )
      }
    ],
    [
      handlePauseApp,
      handleRestartApp,
      handleStartApp,
      onOpenPause,
      router,
      t,
      userSourcePrice?.gpu,
      handleOpenRemarkModal,
      onOpenUpdateModal
    ]
  );

  const { listCompleted } = useGuideStore();
  const isClientSide = useClientSideValue(true);

  useEffect(() => {
    if (!listCompleted && isClientSide) {
      startDriver(
        applistDriverObj(t, () => {
          router.push('/app/edit');
        })
      );
    }
  }, [listCompleted, router, t, isClientSide]);

  return (
    <Box backgroundColor={'grayModern.100'} px={'30px'} pb={5} minH={'100%'}>
      <Flex h={'88px'} alignItems={'center'}>
        <Center
          w="46px"
          h={'46px'}
          mr={4}
          backgroundColor={'#FEFEFE'}
          border={theme.borders[200]}
          borderRadius={'md'}
        >
          <MyIcon name="logo" w={'24px'} h={'24px'} />
        </Center>
        <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
          {t('Applications')}
        </Box>
        {/* <LangSelect /> */}
        <Box ml={3} color={'grayModern.500'}>
          ( {apps.length} )
        </Box>
        <Box flex={1}></Box>
        <Button
          mr={'4px'}
          className="create-app-btn"
          h={'40px'}
          w={'156px'}
          flex={'0 0 auto'}
          leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#FFF'} />}
          onClick={handleCreateApp}
        >
          {t('Create Application')}
        </Button>
      </Flex>

      <Box
        sx={{
          '& > div': {
            gridTemplateColumns: `200px repeat(${columns.length - 1}, 1fr) !important`
          }
        }}
      >
        <MyTable itemClass="appItem" columns={columns} data={apps} />
      </Box>

      <PauseChild />
      {!!delAppName && (
        <DelModal
          appName={delAppName}
          source={apps.find((item) => item.name === delAppName)?.source}
          onClose={() => setDelAppName('')}
          onSuccess={refetchApps}
        />
      )}
      <UpdateModal
        source={apps.find((i) => i.name === updateAppName)?.source}
        isOpen={isOpenUpdateModal}
        onClose={() => {
          setUpdateAppName('');
          onCloseUpdateModal();
        }}
      />
      <Modal isOpen={isOpenRemarkModal} onClose={onCloseRemarkModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={'#fff'} borderBottom={'none'} pt={'24px'}>
            {t('set_remarks_title')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody px={'24px'} pb={'16px'} pt={'0px'}>
            <FormControl>
              <FormLabel>{t('remarks')}</FormLabel>
              <Input
                placeholder={t('set_remarks_placeholder')}
                width={'100%'}
                value={remarkValue}
                onChange={(e) => setRemarkValue(e.target.value)}
                maxLength={60}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter px={'24px'}>
            <Button variant="outline" onClick={onCloseRemarkModal} mr={'12px'}>
              {t('Cancel')}
            </Button>
            <Button colorScheme="blue" onClick={handleSaveRemark}>
              {t('Confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <InsufficientQuotaDialog
        items={exceededQuotas}
        open={exceededDialogOpen}
        onOpenChange={(open) => {
          // Refresh quota on open change
          loadUserQuota();
          setExceededDialogOpen(open);
        }}
        onConfirm={() => {
          setExceededDialogOpen(false);
          track('deployment_start', {
            module: 'applaunchpad'
          });
          router.push('/app/edit');
        }}
      />
    </Box>
  );
};

export default React.memo(AppList);
