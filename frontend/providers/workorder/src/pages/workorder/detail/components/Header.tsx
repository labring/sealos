import { updateWorkOrderById } from '@/api/workorder';
import AppStatusTag from '@/components/AppStatusTag';
import MyIcon from '@/components/Icon';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { WorkOrderDB, WorkOrderStatus } from '@/types/workorder';
import { Box, Button, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Dispatch, useCallback } from 'react';

const Header = ({
  app,
  isLargeScreen = true,
  setShowSlider
}: {
  app: WorkOrderDB;
  isLargeScreen: boolean;
  setShowSlider: Dispatch<boolean>;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lastRoute } = useGlobalStore();
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
        router.push('/workorders');
      } catch (error) {}
    },
    [router, toast]
  );

  return (
    <Flex w={'100%'} h={'86px'} alignItems={'center'}>
      <Flex
        alignItems={'center'}
        cursor={'pointer'}
        onClick={() => {
          router.replace({
            pathname: '/workorders',
            query: {
              status: router.query?.status
            }
          });
        }}
      >
        <MyIcon name="arrowLeft" />
        <Box ml={6} fontWeight={'bold'} color={'black'} fontSize={'20px'} mr="16px">
          {t('Order Detail')}
        </Box>
        {app?.status && <AppStatusTag status={app?.status} showBorder={false} />}
      </Flex>
      <Box flex={1}></Box>
      {!isLargeScreen && (
        <Box mx={4}>
          <Button
            flex={1}
            h={'40px'}
            borderColor={'myGray.200'}
            leftIcon={<MyIcon name="detail" w="16px" h="16px" />}
            variant={'base'}
            bg={'white'}
            onClick={() => setShowSlider(true)}
          >
            {t('Details')}
          </Button>
        </Box>
      )}
      <Button
        _focusVisible={{ boxShadow: '' }}
        mr={5}
        h={'40px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name={'close'} w={'16px'} />}
        variant={'base'}
        bg={'white'}
        onClick={() => handleWorkOrder(app.orderId, 'close')}
      >
        {t('Close')}
      </Button>
      <Button
        h={'40px'}
        borderColor={'myGray.200'}
        leftIcon={<MyIcon name="delete" w={'16px'} />}
        variant={'base'}
        bg={'white'}
        _hover={{
          color: '#FF324A'
        }}
        onClick={() => handleWorkOrder(app.orderId, 'delete')}
      >
        {t('Delete')}
      </Button>
    </Flex>
  );
};

export default Header;
