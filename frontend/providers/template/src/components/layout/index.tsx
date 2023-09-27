import { useGlobalStore } from '@/store/global';
import { Box, Grid } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import AppMenu from './appmenu';

const ShowLayoutRoute: Record<string, boolean> = {
  '/': true,
  '/app': true,
  '/deploy': true
};

export default function Layout({ children }: { children: JSX.Element }) {
  const { screenWidth } = useGlobalStore();
  const router = useRouter();
  const isMobile = useMemo(() => screenWidth < 1024, [screenWidth]);

  return (
    <>
      {ShowLayoutRoute[router.pathname] ? (
        <Grid
          templateColumns={isMobile ? '76px 1fr' : '270px 1fr'}
          h="100vh"
          overflow={'hidden'}
          background={'rgba(150, 153, 180, 0.15)'}>
          <AppMenu isMobile={isMobile} />
          <>{children}</>
        </Grid>
      ) : (
        <Box h="100vh">{children}</Box>
      )}
    </>
  );
}
