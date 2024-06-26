import { getWorkOrderById } from '@/api/workorder';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo, useRef, useState } from 'react';
import AppBaseInfo from './components/AppBaseInfo';
import AppMainInfo from './components/AppMainInfo';
import Header from './components/Header';
import { WorkOrderDB } from '@/types/workorder';
import { useRouter } from 'next/router';

export default function OrderDetail({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const [showSlider, setShowSlider] = useState(false);
  const { screenWidth } = useGlobalStore();
  const { Loading } = useLoading();
  const isLargeScreen = useMemo(() => screenWidth > 1100, [screenWidth]);
  const router = useRouter();
  const [isHandled, setIsHandled] = useState(false);
  const [interval, setInterval] = useState(5 * 1000);
  const prevDataRef = useRef<WorkOrderDB | null>(null);

  const { data: workOrderDetail, refetch: refetchWorkOrder } = useQuery(
    ['getWorkOrderById', orderId],
    () => getWorkOrderById({ orderId }),
    {
      refetchInterval: isHandled ? interval : false,
      onSuccess(data) {
        setIsHandled(data?.manualHandling?.isManuallyHandled || false);
        if (isHandled) {
          const currDialogsLen = data?.dialogs?.length;
          const prevDialogsLen = prevDataRef.current?.dialogs?.length;

          if (!prevDataRef.current || currDialogsLen !== prevDialogsLen) {
            setInterval(5 * 1000);
          } else {
            const newInterval = Math.min(interval + 5 * 1000, 60 * 1000);
            setInterval(newInterval);
          }
          prevDataRef.current = data;
        }
      },
      onError(err: any) {
        if (err?.code === 404) {
          router.push('/');
        }
      }
    }
  );

  return (
    <Flex
      flexDirection={'column'}
      width={'100vw'}
      height={'100vh'}
      bg={'#F3F4F5'}
      px="32px"
      pb="12px"
      overflow={'hidden'}
    >
      {workOrderDetail && (
        <Header app={workOrderDetail} isLargeScreen={isLargeScreen} setShowSlider={setShowSlider} />
      )}
      <Flex position={'relative'} flex={'1 0 0'} h="0" w="100%">
        <Box
          height={'100%'}
          flex={'0 0 410px'}
          w={'410px'}
          mr={4}
          overflow={'overlay'}
          zIndex={1}
          transition={'0.4s'}
          bg={'white'}
          border={'1px solid #DEE0E2'}
          borderRadius={'md'}
          {...(isLargeScreen
            ? {}
            : {
                position: 'absolute',
                left: 0,
                boxShadow: '7px 4px 12px rgba(165, 172, 185, 0.25)',
                transform: `translateX(${showSlider ? '0' : '-500'}px)`
              })}
        >
          {workOrderDetail && <AppBaseInfo app={workOrderDetail} />}
        </Box>
        <Flex
          w="100%"
          height={'100%'}
          flex={'1 0 0'}
          position={'relative'}
          bg={'white'}
          border={'1px solid #DEE0E2'}
          borderRadius={'md'}
          flexDirection={'column'}
        >
          {workOrderDetail && workOrderDetail.dialogs?.length ? (
            <AppMainInfo
              app={workOrderDetail}
              refetchWorkOrder={refetchWorkOrder}
              isManuallyHandled
            />
          ) : (
            <Loading loading={true} fixed={false} />
          )}
        </Flex>
      </Flex>

      {!isLargeScreen && showSlider && (
        <Box
          position={'fixed'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          onClick={() => setShowSlider(false)}
        />
      )}
    </Flex>
  );
}

export async function getServerSideProps(context: any) {
  const orderId = context.query?.orderId || '';

  return {
    props: { ...(await serviceSideProps(context)), orderId }
  };
}
