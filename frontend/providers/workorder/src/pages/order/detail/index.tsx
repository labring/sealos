import { getOrderById } from '@/api/order';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import Header from './components/Header';
import { useTranslation } from 'next-i18next';
import AppBaseInfo from './components/AppBaseInfo';
import AppMainInfo from './components/AppMainInfo';

export default function OrderDetail({ orderID }: { orderID: string }) {
  const { t } = useTranslation();
  const [showSlider, setShowSlider] = useState(false);
  const { screenWidth } = useGlobalStore();
  const { Loading } = useLoading();
  const isLargeScreen = useMemo(() => screenWidth > 780, [screenWidth]);

  const { data: appDetail, refetch } = useQuery(['getOrderList', orderID], () =>
    getOrderById({
      orderID
    })
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
      {appDetail && (
        <Header app={appDetail} isLargeScreen={isLargeScreen} setShowSlider={setShowSlider} />
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
          {appDetail && <AppBaseInfo app={appDetail} />}
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
          {appDetail ? (
            <AppMainInfo app={appDetail} refetch={refetch} />
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
  const orderID = context.query?.orderID || '';

  return {
    props: { ...(await serviceSideProps(context)), orderID }
  };
}
