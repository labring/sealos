import { Box, Button, Flex, Image, MenuButton, Text } from '@chakra-ui/react';
import { SealosMenu, useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

import { pauseDevbox, restartDevbox, startDevbox } from '@/api/devbox';
import { useRouter } from '@/i18n';
import { useGlobalStore } from '@/stores/global';
import { DevboxListItemTypeV2 } from '@/types/devbox';

import MyIcon from '@/components/Icon';
import IDEButton from '@/components/IDEButton';
import PodLineChart from '@/components/PodLineChart';
import { AdvancedTable } from '@/components/AdvancedTable';
import DevboxStatusTag from '@/components/DevboxStatusTag';
import ReleaseModal from '@/components/modals/ReleaseModal';

const DelModal = dynamic(() => import('@/components/modals/DelModal'));

const DevboxList = ({
  devboxList = [],
  refetchDevboxList
}: {
  devboxList: DevboxListItemTypeV2[];
  refetchDevboxList: () => void;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const { message: toast } = useMessage();

  // TODO: Unified Loading Behavior
  const { setLoading } = useGlobalStore();

  const [onOpenRelease, setOnOpenRelease] = useState(false);
  const [delDevbox, setDelDevbox] = useState<DevboxListItemTypeV2 | null>(null);
  const [currentDevboxListItem, setCurrentDevboxListItem] = useState<DevboxListItemTypeV2 | null>(
    null
  );

  const handleOpenRelease = (devbox: DevboxListItemTypeV2) => {
    setCurrentDevboxListItem(devbox);
    setOnOpenRelease(true);
  };
  const handlePauseDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
      try {
        setLoading(true);
        await pauseDevbox({ devboxName: devbox.name });
        toast({
          title: t('pause_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('pause_error'),
          status: 'error'
        });
        console.error(error);
      }
      refetchDevboxList();
      setLoading(false);
    },
    [refetchDevboxList, setLoading, t, toast]
  );
  const handleRestartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
      try {
        setLoading(true);
        await restartDevbox({ devboxName: devbox.name });
        toast({
          title: t('restart_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('restart_error'),
          status: 'error'
        });
        console.error(error, '==');
      }
      refetchDevboxList();
      setLoading(false);
    },
    [refetchDevboxList, setLoading, t, toast]
  );
  const handleStartDevbox = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
      try {
        setLoading(true);
        await startDevbox({ devboxName: devbox.name });
        toast({
          title: t('start_success'),
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('start_error'),
          status: 'error'
        });
        console.error(error, '==');
      }
      refetchDevboxList();
      setLoading(false);
    },
    [refetchDevboxList, setLoading, t, toast]
  );
  const handleGoToTerminal = useCallback(
    async (devbox: DevboxListItemTypeV2) => {
      const defaultCommand = `kubectl exec -it $(kubectl get po -l app.kubernetes.io/name=${devbox.name} -oname) -- sh -c "clear; (bash || ash || sh)"`;
      try {
        sealosApp.runEvents('openDesktopApp', {
          appKey: 'system-terminal',
          query: {
            defaultCommand
          },
          messageData: { type: 'new terminal', command: defaultCommand }
        });
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('jump_terminal_error'),
          status: 'error'
        });
        console.error(error);
      }
    },
    [t, toast]
  );
  const columns: {
    title: string;
    dataIndex?: keyof DevboxListItemTypeV2;
    key: string;
    render?: (item: DevboxListItemTypeV2) => JSX.Element;
  }[] = [
    {
      title: t('name'),
      key: 'name',
      render: (item) => {
        return (
          <Flex alignItems={'center'} gap={'6px'} ml={4} mr={1}>
            <Image
              width={'20px'}
              height={'20px'}
              alt={item.id}
              src={`/images/${item.template.templateRepository.iconId}.svg`}
            />
            <Box color={'grayModern.900'} fontSize={'md'}>
              {item.name}
            </Box>
          </Flex>
        );
      }
    },
    {
      title: t('status'),
      key: 'status',
      render: (item) => <DevboxStatusTag status={item.status} h={'27px'} />
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (item) => {
        return <Text color={'grayModern.600'}>{item.createTime}</Text>;
      }
    },
    {
      title: t('cpu'),
      key: 'cpu',
      render: (item) => (
        <Box h={'35px'} w={['120px', '130px', '140px']}>
          <Box h={'35px'} w={['120px', '130px', '140px']} position={'relative'}>
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
      title: t('memory'),
      key: 'storage',
      render: (item) => (
        <Box h={'35px'} w={['120px', '130px', '140px']}>
          <Box h={'35px'} w={['120px', '130px', '140px']} position={'relative'}>
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
    {
      title: t('control'),
      key: 'control',
      render: (item) => (
        <Flex>
          <IDEButton
            devboxName={item.name}
            sshPort={item.sshPort}
            status={item.status}
            mr={'8px'}
            runtimeType={item.template.templateRepository.iconId as string}
          />
          <Button
            mr={'8px'}
            size={'sm'}
            boxSize={'32px'}
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            minW={'unset'}
            // leftIcon={<MyIcon name={'detail'} w={'16px'} />}
            onClick={() => {
              router.push(`/devbox/detail/${item.name}`);
            }}
          >
            {/* {t('detail')} */}
            <MyIcon name={'detail'} w={'16px'} />
          </Button>
          <SealosMenu
            width={100}
            Button={
              <MenuButton as={Button} variant={'square'} boxSize={'32px'}>
                <MyIcon name={'more'} />
              </MenuButton>
            }
            menuList={[
              {
                child: (
                  <>
                    <MyIcon name={'version'} w={'16px'} />
                    <Box ml={2}>{t('publish')}</Box>
                  </>
                ),
                onClick: () => handleOpenRelease(item)
              },
              {
                child: (
                  <>
                    <MyIcon name={'terminal'} w={'16px'} />
                    <Box ml={2}>{t('terminal')}</Box>
                  </>
                ),
                onClick: () => handleGoToTerminal(item),
                menuItemStyle: {
                  borderBottomLeftRadius: '0px',
                  borderBottomRightRadius: '0px',
                  borderBottom: '1px solid #F0F1F6'
                }
              },
              {
                child: (
                  <>
                    <MyIcon name={'change'} w={'16px'} />
                    <Box ml={2}>{t('update')}</Box>
                  </>
                ),
                onClick: () => router.push(`/devbox/create?name=${item.name}`)
              },
              ...(item.status.value === 'Stopped'
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'start'} w={'16px'} />
                          <Box ml={2}>{t('start')}</Box>
                        </>
                      ),
                      onClick: () => handleStartDevbox(item)
                    }
                  ]
                : []),
              // maybe Error or other status,all can restart
              ...(item.status.value !== 'Stopped'
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'restart'} w={'16px'} />
                          <Box ml={2}>{t('restart')}</Box>
                        </>
                      ),
                      onClick: () => handleRestartDevbox(item)
                    }
                  ]
                : []),
              ...(item.status.value === 'Running'
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'shutdown'} w={'16px'} />
                          <Box ml={2}>{t('shutdown')}</Box>
                        </>
                      ),
                      onClick: () => handlePauseDevbox(item)
                    }
                  ]
                : []),
              {
                child: (
                  <>
                    <MyIcon name={'delete'} w={'16px'} />
                    <Box ml={2}>{t('delete')}</Box>
                  </>
                ),
                menuItemStyle: {
                  _hover: {
                    color: 'red.600',
                    bg: 'rgba(17, 24, 36, 0.05)'
                  }
                },
                onClick: () => setDelDevbox(item)
              }
            ]}
          />
        </Flex>
      )
    }
  ];
  return (
    <>
      <AdvancedTable columns={columns} data={devboxList} itemClass="devboxListItem" />
      {!!delDevbox && (
        <DelModal
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={refetchDevboxList}
          refetchDevboxList={refetchDevboxList}
        />
      )}
      {!!onOpenRelease && !!currentDevboxListItem && (
        <ReleaseModal
          onSuccess={() => {
            router.push(`/devbox/detail/${currentDevboxListItem?.name}`);
          }}
          onClose={() => {
            setOnOpenRelease(false);
            setCurrentDevboxListItem(null);
          }}
          devbox={currentDevboxListItem}
        />
      )}
    </>
  );
};

export default DevboxList;
