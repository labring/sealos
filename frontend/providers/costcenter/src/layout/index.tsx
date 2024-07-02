import useSessionStore from '@/stores/session';
import { Box, Flex, Link, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import styles from './index.module.scss';
import SideBar from './sidebar';

export default function Layout({ children }: any) {
  const { setSession } = useSessionStore();
  const [isLodaing, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    return createSealosApp();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const result = await sealosApp.getSession();
        setSession(result);
        setIsLoading(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          setIsLoading(false);
        }
        setIsError(true);
      }
    };
    initApp();
  }, [isLodaing, setSession]);

  return (
    <Flex
      w="100vw"
      h="100vh"
      position="relative"
      background="#EAEBF0"
      pt={'4px'}
      pb="10px"
      alignItems={'center'}
      justifyContent={'center'}
    >
      {isLodaing ? (
        <Flex w={'100%'} h={'100%'} alignItems={'center'} justifyContent={'center'}>
          {isError ? (
            <Text>
              please go to&nbsp;
              <Link color="blue.600" href="https://cloud.sealos.io/">
                cloud.sealos.io
              </Link>
            </Text>
          ) : (
            <></>
          )}
        </Flex>
      ) : (
        <Flex width="full" height="full" maxWidth="1600px" justify={'center'}>
          <SideBar />
          <Box flexGrow={1} borderRadius="8px" overflow={'hidden'} w={0}>
            {children}
          </Box>
        </Flex>
      )}
    </Flex>
  );
}
