import { Box, Center, Grid, useBreakpointValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useGuideStore } from '@/store/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { Info } from 'lucide-react';
import { useTranslation } from 'next-i18next';

const ShowLayoutRoute: Record<string, boolean> = {
  '/': true,
  '/app': true,
  '/deploy': true
};

const AppMenu = dynamic(() => import('./appmenu'), {
  ssr: false,
  loading: () => <div></div>
});

export default function Layout({ children }: { children: JSX.Element }) {
  const router = useRouter();
  const firstColumnWidth = useBreakpointValue({ base: '230px', xl: '270px' });
  const { listCompleted, createCompleted } = useGuideStore();
  const isClientSide = useClientSideValue();
  const { t } = useTranslation();

  return (
    <>
      {ShowLayoutRoute[router.pathname] ? (
        <>
          {(!listCompleted || !createCompleted) && isClientSide && (
            <Center
              borderTop={'1px solid #BFDBFE'}
              borderBottom={'1px solid #BFDBFE'}
              bg={'#EFF6FF'}
              h={'56px'}
              w={'100%'}
              fontSize={'16px'}
              fontWeight={500}
              color={'#2563EB'}
              gap={'12px'}
            >
              <Info size={16} />
              {t('driver.create_app_header')}
            </Center>
          )}
          <Grid
            templateColumns={`${firstColumnWidth} 1fr`}
            h="100vh"
            overflow={'hidden'}
            background={'#F4F4F7'}
          >
            <AppMenu />
            <>{children}</>
          </Grid>
        </>
      ) : (
        <Box h="100vh">{children}</Box>
      )}
    </>
  );
}
