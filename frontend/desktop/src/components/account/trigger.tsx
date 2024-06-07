import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { Center, Flex, Image } from '@chakra-ui/react';
import { MutableRefObject } from 'react';
import { useDesktopContext } from '../desktop_content/providers';

export default function Trigger({ showAccountRef }: { showAccountRef: MutableRefObject<boolean> }) {
  const desktopContext = useDesktopContext();
  const user = useSessionStore((state) => state.session)?.user;
  const logo = useConfigStore().layoutConfig?.logo;

  console.log(desktopContext, 'desktopContext');

  return (
    <Flex
      flexShrink={0}
      alignItems={'center'}
      justifyContent={'center'}
      display={{ base: 'flex', lg: 'none' }}
      onClick={() => {
        showAccountRef.current = true;
        desktopContext?.onOpen(() => {
          showAccountRef.current = false;
        });
      }}
    >
      <Center
        width={{ base: '32px', sm: '36px' }}
        height={{ base: '32px', sm: '36px' }}
        bg={'white'}
        borderRadius="full"
      >
        <Image
          width={{ base: '17px', sm: '24px' }}
          height={{ base: '17px', sm: '24px' }}
          borderRadius="full"
          src={user?.avatar || ''}
          fallbackSrc={logo}
          alt="user avator"
        />
      </Center>
    </Flex>
  );
}
