import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { Center, Flex, Image } from '@chakra-ui/react';
import { Dispatch, SetStateAction } from 'react';

export default function Trigger({
  setShowAccount,
  showAccount
}: {
  showAccount: boolean;
  setShowAccount: Dispatch<SetStateAction<boolean>>;
}) {
  const user = useSessionStore((state) => state.session)?.user;
  const logo = useConfigStore().layoutConfig?.logo;

  return (
    <Flex
      flexShrink={0}
      alignItems={'center'}
      justifyContent={'center'}
      display={{ base: 'flex', lg: 'none' }}
      onClick={() => {
        setShowAccount(true);
      }}
      cursor={'pointer'}
    >
      <Center
        width={{ base: '32px', sm: '36px' }}
        height={{ base: '32px', sm: '36px' }}
        bg={'white'}
        borderRadius="full"
      >
        <Image
          width={user?.avatar ? 'full' : ''}
          height={user?.avatar ? 'full' : ''}
          objectFit={'cover'}
          borderRadius="full"
          src={user?.avatar || ''}
          fallbackSrc={'/images/default-user.svg'}
          alt="user avator"
          draggable={'false'}
        />
      </Center>
    </Flex>
  );
}
