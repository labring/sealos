import { updateWorkOrderById } from '@/api/workorder';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import MyMenu from '@/components/Menu';
import MyTable from '@/components/Table';
import { useToast } from '@/hooks/useToast';
import { WorkOrderDB, WorkOrderStatus } from '@/types/workorder';
import { formatTime } from '@/utils/tools';
import { Box, Button, Flex, FlexProps, MenuButton } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';

const OrderList = ({
  apps = [],
  refetchApps
}: {
  apps: WorkOrderDB[];
  refetchApps: () => void;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleWorkOrder = useCallback(
    async (id: string, method: 'delete' | 'close') => {
      try {
        await updateWorkOrderById({
          orderId: id,
          updates:
            method === 'delete'
              ? {
                  status: WorkOrderStatus.Deleted
                }
              : {
                  status: WorkOrderStatus.Completed
                }
        });
        toast({
          title: `success`,
          status: 'success'
        });
      } catch (error) {}
      refetchApps();
    },
    [refetchApps, toast]
  );

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof WorkOrderDB;
      key: string;
      render?: (item: WorkOrderDB) => JSX.Element;
      ItemStyle?: FlexProps;
    }[]
  >(
    () => [
      {
        title: 'Order Name',
        key: 'name',
        render: (item: WorkOrderDB) => {
          return (
            <Box color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.orderId}
            </Box>
          );
        },
        ItemStyle: {
          pl: '28px'
        }
      },
      {
        title: 'Problem Description',
        key: 'description',
        render: (item: WorkOrderDB) => {
          return (
            <Box
              maxW={'300px'}
              color={'#24282C'}
              fontSize={'12px'}
              fontWeight={'500'}
              noOfLines={1}
            >
              {item.description}
            </Box>
          );
        },
        ItemStyle: {
          flexBasis: '180px'
        }
      },
      {
        title: 'Status',
        key: 'status',
        render: (item: WorkOrderDB) => {
          return <AppStatusTag status={item.status} showBorder={false} />;
        }
      },
      {
        title: 'Create Time',
        key: 'createTime',
        render: (item: WorkOrderDB) => {
          return (
            <Box color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {formatTime(item.createTime, 'YYYY-MM-DD HH:mm')}
            </Box>
          );
        }
      },
      {
        title: 'Question Type',
        key: 'QuestionType',
        render: (item: WorkOrderDB) => {
          return (
            <Box color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.type}
            </Box>
          );
        }
      },
      {
        title: 'Operation',
        key: 'control',
        render: (item: WorkOrderDB) => (
          <Flex>
            <Button
              fontSize={'12px'}
              mr={5}
              variant={'base'}
              leftIcon={<MyIcon name={'detail'} w={'16px'} h="16px" />}
              px={'8px'}
              onClick={() => {
                router.push({
                  pathname: `/workorder/detail`,
                  query: {
                    ...router.query,
                    orderId: item.orderId
                  }
                });
              }}
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
                      <MyIcon name={'close'} w={'14px'} />
                      <Box ml={2}>{t('Close')}</Box>
                    </>
                  ),
                  onClick: () => handleWorkOrder(item.orderId, 'close')
                },
                {
                  child: (
                    <>
                      <MyIcon name={'delete'} w={'14px'} />
                      <Box ml={2}>{t('Delete')}</Box>
                    </>
                  ),
                  onClick: () => handleWorkOrder(item.orderId, 'delete')
                }
              ]}
            />
          </Flex>
        )
      }
    ],
    [handleWorkOrder, router, t]
  );

  return <MyTable columns={columns} data={apps} />;
};

export default OrderList;
