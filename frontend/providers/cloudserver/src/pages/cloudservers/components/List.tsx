import { updateCloudServerStatus } from '@/api/cloudserver';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import { CVMInstanceType, HandleEnum } from '@/types/cloudserver';
import { formatTime } from '@/utils/tools';
import { Box, Button, Center, Flex, FlexProps, MenuButton, Text } from '@chakra-ui/react';
import { LogoutIcon, MyTable, SealosMenu, useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useMemo, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';
import DelModal from './DelModal';
import { useConfirm } from '@/hooks/useConfirm';
import { useCopyData } from '@/hooks/useCopyData';
import { IntermediatePhases, IntermediateStates, PhaseEnum } from '@/types/cloudserver';

const OrderList = ({ apps = [], refetchApps }: { apps: any[]; refetchApps: () => void }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const { copyData } = useCopyData();
  const [delAppName, setDelAppName] = useState('');

  const { openConfirm, ConfirmChild } = useConfirm({
    content: t('close cloud server tip')
  });

  const handleWorkOrder = useCallback(
    async (id: string, method: HandleEnum) => {
      try {
        await updateCloudServerStatus({
          instanceName: id,
          handle: method
        });
        toast({
          title: `success`,
          status: 'success'
        });
      } catch (error: any) {
        toast({
          status: 'error',
          title: error?.message
        });
      }
      refetchApps();
    },
    [refetchApps, toast]
  );

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof CVMInstanceType;
      key: string;
      render?: (item: any) => JSX.Element;
      ItemStyle?: FlexProps;
    }[]
  >(
    () => [
      {
        title: t('Name'),
        key: 'name',
        render: (item: CVMInstanceType) => {
          return (
            <Box pl={'14px'} color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.instanceName}
            </Box>
          );
        },
        ItemStyle: {
          pl: '28px'
        }
      },
      {
        title: t('Status'),
        key: 'status',
        render: (item: CVMInstanceType) => <AppStatusTag status={item.phase} showBorder={false} />
      },
      {
        title: t('Create Time'),
        key: 'createTime',
        render: (item: any) => {
          return (
            <Box color={'grayModern.600'}>{formatTime(item.createTime, 'YYYY-MM-DD HH:mm')}</Box>
          );
        }
      },
      {
        title: t('CPU'),
        key: 'CPU',
        dataIndex: 'cpu'
      },
      {
        title: t('Memory'),
        key: 'Memory',
        dataIndex: 'memory'
      },
      {
        title: t('sshName'),
        key: 'sshName',
        dataIndex: 'loginName'
      },
      {
        title: t('sshPassword'),
        key: 'sshPassword',
        render: (item: CVMInstanceType) => {
          return (
            <Flex
              alignItems={'center'}
              cursor={'pointer'}
              gap={'4px'}
              onClick={() => copyData(item.loginPassword)}
              height={'12px'}
            >
              <Box pt={'2px'}>***********</Box>
              <MyIcon name="copy" color={'grayModern.500'} width={'12px'} />
            </Flex>
          );
        }
      },
      {
        title: t('ssh port'),
        key: 'ssh port',
        dataIndex: 'loginPort'
      },
      {
        title: t('IP Address'),
        key: 'IP-address',
        render: (item: CVMInstanceType) => {
          return (
            <Flex flexDirection={'column'}>
              <Center
                gap={'4px'}
                cursor={'pointer'}
                onClick={() => copyData(item?.privateIpAddresses?.join(',') || '')}
              >
                {item?.privateIpAddresses?.join(',')}(内)
                <MyIcon name="copy" color={'grayModern.500'} width={'12px'} />
              </Center>
              {item?.publicIpAddresses ? (
                <Center
                  gap={'4px'}
                  cursor={'pointer'}
                  onClick={() => copyData(item?.publicIpAddresses?.join(',') || '')}
                >
                  {item?.publicIpAddresses?.join(',')}(公)
                  <MyIcon name="copy" color={'grayModern.500'} width={'12px'} />
                </Center>
              ) : (
                <Text>{t('Public IP is not enabled')}</Text>
              )}
            </Flex>
          );
        }
      },

      {
        title: t('Operation'),
        key: 'control',
        render: (item: CVMInstanceType) => (
          <Flex>
            <SealosMenu
              width={100}
              Button={
                <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                  <MyIcon name={'more'} px={3} />
                </MenuButton>
              }
              menuList={[
                {
                  child: (
                    <>
                      <MyIcon name={'start'} w={'14px'} />
                      <Box ml={2}>{t('Start')}</Box>
                    </>
                  ),
                  menuItemStyle: {
                    isDisabled:
                      IntermediatePhases.includes(item.phase) ||
                      IntermediateStates.includes(item.state) ||
                      item.phase === PhaseEnum.Started
                  },
                  onClick: () => handleWorkOrder(item.instanceName, HandleEnum.Start)
                },
                {
                  child: (
                    <>
                      <MyIcon name={'terminal'} w={'14px'} />
                      <Box ml={2}>{t('terminal')}</Box>
                    </>
                  ),
                  menuItemStyle: {
                    isDisabled: item.phase !== PhaseEnum.Started
                  },
                  onClick: () => {
                    copyData(
                      item.loginPassword,
                      t('Password copied to clipboard') || 'Password copied to clipboard',
                      {
                        duration: 2000
                      }
                    );
                    const defaultCommand = `ssh ${item.loginName}@${item.privateIpAddresses}`;
                    console.log(defaultCommand);
                    sealosApp.runEvents('openDesktopApp', {
                      appKey: 'system-terminal',
                      query: {
                        defaultCommand
                      },
                      messageData: { type: 'new terminal', command: defaultCommand },
                      appSize: 'maxmin'
                    });
                  }
                },
                {
                  child: (
                    <>
                      <MyIcon name={'restart'} w={'14px'} />
                      <Box ml={2}>{t('ReStart')}</Box>
                    </>
                  ),
                  menuItemStyle: {
                    isDisabled:
                      IntermediatePhases.includes(item.phase) ||
                      IntermediateStates.includes(item.state) ||
                      item.phase !== PhaseEnum.Started
                  },
                  onClick: () => handleWorkOrder(item.instanceName, HandleEnum.Restart)
                },
                {
                  child: (
                    <>
                      <LogoutIcon w={'14px'} />
                      <Box ml={2}>{t('Stop')}</Box>
                    </>
                  ),
                  menuItemStyle: {
                    isDisabled:
                      IntermediatePhases.includes(item.phase) ||
                      IntermediateStates.includes(item.state) ||
                      item.phase !== PhaseEnum.Started
                  },
                  onClick: openConfirm(() => handleWorkOrder(item.instanceName, HandleEnum.Stop))
                },
                {
                  child: (
                    <>
                      <MyIcon name={'delete'} w={'14px'} />
                      <Box ml={2}>{t('Delete')}</Box>
                    </>
                  ),
                  menuItemStyle: {
                    _hover: {
                      color: 'red.600',
                      bg: 'rgba(17, 24, 36, 0.05)'
                    },
                    isDisabled:
                      IntermediatePhases.includes(item.phase) ||
                      IntermediateStates.includes(item.state) ||
                      item.phase !== PhaseEnum.Stopped
                  },
                  onClick: () => setDelAppName(item.instanceName)
                }
              ]}
            />
          </Flex>
        )
      }
    ],
    [copyData, handleWorkOrder, openConfirm, t]
  );

  return (
    <>
      <MyTable columns={columns} data={apps} />
      {!!delAppName && (
        <DelModal appName={delAppName} onClose={() => setDelAppName('')} onSuccess={refetchApps} />
      )}
      <ConfirmChild />
    </>
  );
};

export default OrderList;
