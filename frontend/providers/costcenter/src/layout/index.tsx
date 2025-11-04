import useSessionStore from '@/stores/session';
import { Box, Flex, Link, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import SideBar from './sidebar';
import useBillingStore from '@/stores/billing';

export default function Layout({ children }: any) {
  const { setSession } = useSessionStore();
  const { setNamespace, namespaceList } = useBillingStore();
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

        // Selected region will be automatically populated (current region will always be the first one). We don't need to set manually here.
        setNamespace(namespaceList.findIndex((item) => item[0] === result.user.nsid) ?? 0);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          setIsLoading(false);
        }
        setIsError(true);
      }
    };
    initApp();
  }, [isLodaing, setSession, namespaceList, setNamespace]);

  return (
    <Flex
      w="100vw"
      position="relative"
      pt={'4px'}
      pb="10px"
      px={'2.5rem'}
      alignItems={'center'}
      justifyContent={'center'}
      className="bg-background"
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
        <Flex
          position={'relative'}
          width="full"
          height={'auto'}
          maxWidth="1600px"
          minHeight={'100vh'}
          justify={'center'}
          alignItems={'start'}
          gap={'1.5rem'}
        >
          <div className="pt-10 min-w-[12rem] sticky top-0">
            <SideBar />
          </div>
          <Box flexGrow={1} borderRadius="8px" overflow={'hidden'} w={0} className="pt-10">
            {children}
          </Box>
        </Flex>
      )}
    </Flex>
  );
}
