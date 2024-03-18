import { Box, Grid } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import AppMenu from './appmenu';

const ShowLayoutRoute: Record<string, boolean> = {
  '/': true,
  '/app': true,
  '/deploy': true
};

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
