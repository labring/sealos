import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { useJobStore } from '@/store/job';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import AppBaseInfo from './components/AppBaseInfo';
import AppMainInfo from './components/AppMainInfo';
import Header from './components/Header';

export default function DetailPage({ appName }: { appName: string }) {
  const { screenWidth } = useGlobalStore();
  const { toast } = useToast();
  const { Loading } = useLoading();
  const { JobDetail, loadJobDetail } = useJobStore();
  const [showSlider, setShowSlider] = useState(false);
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);

  const { refetch } = useQuery(['getCronJobDetail', appName], () => loadJobDetail(appName), {
    onError(err) {
      toast({
        title: String(err),
        status: 'error'
      });
    }
  });

  return (
    <Flex flexDirection={'column'} height={'100vh'} backgroundColor={'#F3F4F5'} px={9} pb={4}>
      <Box>
        <Header
          appName={appName}
          appStatus={JobDetail?.status}
          isPause={JobDetail?.isPause}
          refetch={refetch}
          setShowSlider={setShowSlider}
          isLargeScreen={isLargeScreen}
        />
      </Box>
      <Flex position={'relative'} flex={'1 0 0'} h={0}>
        <Box
          h={'100%'}
          flex={'1 1 500px'}
          maxW={'500px'}
          mr={4}
          overflow={'overlay'}
          zIndex={9}
          transition={'0.4s'}
          bg={'white'}
          borderRadius={'md'}
          border={'1px solid #DEE0E2'}
          {...(isLargeScreen
            ? {}
            : {
                position: 'absolute',
                left: 0,
                boxShadow: '7px 4px 12px rgba(165, 172, 185, 0.25)',
                transform: `translateX(${showSlider ? '0' : '-1000'}px)`
              })}
        >
          {JobDetail ? <AppBaseInfo appName={appName} /> : <Loading loading={true} fixed={false} />}
        </Box>
        <Flex
          border={'1px solid #DEE0E2'}
          flexDirection={'column'}
          h={'100%'}
          flex={'1 1 740px'}
          bg={'white'}
        >
          {JobDetail ? <AppMainInfo appName={appName} /> : <Loading loading={true} fixed={false} />}
        </Flex>
      </Flex>
      {/* mask */}
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
export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';

  return {
    props: {
      appName,
      ...(await serviceSideProps(content))
    }
  };
}
