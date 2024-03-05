import { updateOrderById } from '@/api/order';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import MyMenu from '@/components/Menu';
import MyTable from '@/components/Table';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { OrderDB } from '@/types/order';
import { formatTime } from '@/utils/tools';
import { Box, Button, Flex, FlexProps, MenuButton } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';

const OrderList = ({ apps = [], refetchApps }: { apps: OrderDB[]; refetchApps: () => void }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { setLoading } = useGlobalStore();
  const { toast } = useToast();

  const handleCloseOrder = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        await updateOrderById({
          orderID: id,
          updates: {
            status: 'completed'
          }
        });
        toast({
          title: `success`,
          status: 'success'
        });
      } catch (error) {}
      refetchApps();
      setLoading(false);
    },
    [refetchApps, setLoading, toast]
  );

  const handleDeleteOrder = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        await updateOrderById({
          orderID: id,
          updates: {
            isDeleted: true
          }
        });
        toast({
          title: `success`,
          status: 'success'
        });
      } catch (error) {}
      refetchApps();
      setLoading(false);
    },
    [refetchApps, setLoading, toast]
  );

  const columns = useMemo<
    {
      title: string;
      dataIndex?: keyof OrderDB;
      key: string;
      render?: (item: OrderDB) => JSX.Element;
      ItemStyle?: FlexProps;
    }[]
  >(
    () => [
      {
        title: 'Order Name',
        key: 'name',
        render: (item: OrderDB) => {
          return (
            <Box color={'myGray.900'} fontSize={'md'} fontWeight={'bold'}>
              {item.orderID}
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
        render: (item: OrderDB) => {
          return (
            <Box color={'#24282C'} fontSize={'12px'} fontWeight={'500'} noOfLines={1}>
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
        render: (item: OrderDB) => {
          return <AppStatusTag status={item.status} showBorder={false} />;
        }
      },
      {
        title: 'Create Time',
        key: 'createTime',
        render: (item: OrderDB) => {
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
        render: (item: OrderDB) => {
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
        render: (item: OrderDB) => (
          <Flex>
            <Button
              fontSize={'12px'}
              mr={5}
              variant={'base'}
              leftIcon={<MyIcon name={'detail'} w={'16px'} h="16px" />}
              px={'8px'}
              onClick={() => {
                router.push(`/order/detail?orderID=${item.orderID}`);
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
                  onClick: () => handleCloseOrder(item.orderID)
                },
                {
                  child: (
                    <>
                      <MyIcon name={'delete'} w={'14px'} />
                      <Box ml={2}>{t('Delete')}</Box>
                    </>
                  ),
                  onClick: () => handleDeleteOrder(item.orderID)
                }
              ]}
            />
          </Flex>
        )
      }
    ],
    [handleCloseOrder, handleDeleteOrder, router, t]
  );

  return <MyTable columns={columns} data={apps} />;
};

export default OrderList;
