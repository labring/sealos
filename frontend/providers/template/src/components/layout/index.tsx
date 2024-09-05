import { Box, Grid, useBreakpointValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

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

  return (
    <>
      {ShowLayoutRoute[router.pathname] ? (
        <Grid
          templateColumns={`${firstColumnWidth} 1fr`}
          h="100vh"
          overflow={'hidden'}
          background={'#F4F4F7'}
        >
          <AppMenu />
          <>{children}</>
        </Grid>
      ) : (
        <Box h="100vh">{children}</Box>
      )}
    </>
  );
}
