import useSessionStore from '@/stores/session';
import { Avatar, Box, Center, Divider, Flex, Image, Text, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { SignOutIcon } from '../Icon';

export default function Account() {
  const { t } = useTranslation();
  const router = useRouter();
  const { delSession, getSession } = useSessionStore();
  const userInfo = getSession();
  const accountDisclosure = useDisclosure();

  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    router.replace('/signin');
  };

  return (
    <Flex
      cursor={'pointer'}
      ml="16px"
      w="36px"
      h="36px"
      borderRadius={'50%'}
      justifyContent={'center'}
      alignItems={'center'}
      position={'relative'}
      onClick={accountDisclosure.onOpen}
    >
      <Image
        opacity={'0.9'}
        width={'36px'}
        height={'36px'}
        borderRadius="full"
        src={userInfo?.user?.avatar || ''}
        fallbackSrc={'/images/avatar.svg'}
        alt="user avator"
      />

      {accountDisclosure.isOpen && (
        <>
          <Box
            position={'fixed'}
            inset={0}
            zIndex={'998'}
            onClick={(e) => {
              e.stopPropagation();
              accountDisclosure.onClose();
            }}
          ></Box>
          <Flex
            w="188px"
            flexDirection={'column'}
            position={'absolute'}
            borderRadius={'12px'}
            background={'#FFF'}
            boxShadow={'0px 10px 18px 0px rgba(187, 196, 206, 0.25)'}
            top={'50px'}
            right={'0px'}
            zIndex={'999'}
          >
            <Flex w="100%" h="66px" alignItems={'center'} justifyContent={'center'}>
              <Image
                width={'36px'}
                height={'36px'}
                borderRadius="full"
                src={userInfo?.user?.avatar || ''}
                fallbackSrc={'/images/avatar.svg'}
                alt="user avator"
              />
              <Text ml="12px">{userInfo?.user?.name}</Text>
            </Flex>
            <Divider />
            <Flex
              w="100%"
              h="46px"
              justifyContent={'center'}
              alignItems={'center'}
              onClick={logout}
            >
              <SignOutIcon />
              <Text ml="6px" color={'#24282C'} fontSize={'12px'} fontWeight={500}>
                {t('Log Out')}
              </Text>
            </Flex>
          </Flex>
        </>
      )}
    </Flex>
  );
}
