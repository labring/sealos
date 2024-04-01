import { Box, Grid } from '@chakra-ui/react';
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

  return (
    <>
      {ShowLayoutRoute[router.pathname] ? (
        <Grid
          templateColumns={'270px 1fr'}
          h="100vh"
          overflow={'hidden'}
          background={'rgba(150, 153, 180, 0.15)'}
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
