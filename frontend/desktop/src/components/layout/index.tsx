import { Box } from '@chakra-ui/react';
import Head from 'next/head';

export default function Layout(props: any) {
  return (
    <>
      <Head>
        <title>sealos Cloud</title>
        <meta name="description" content="sealos cloud dashboard" />
      </Head>
      <Box
        position={'relative'}
        width={'100vw'}
        height={'100vh'}
        overflow={'hidden'}
        backgroundImage={'url(/images/background.svg)'}
        backgroundRepeat={'no-repeat'}
        backgroundSize={'cover'}
      >
        {props.children}
      </Box>
    </>
  );
}
