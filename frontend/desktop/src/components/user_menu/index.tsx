/* eslint-disable @next/next/no-img-element */
import { Box, Flex } from '@chakra-ui/react';
import Iconfont from '../iconfont';
import Notification from '@/components/notification';
import { useState } from 'react';
import Account from '@/components/account';
import { useDisclosure } from '@chakra-ui/react';
import useSessionStore from '@/stores/session';

export default function Index(props: any) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationAmount, setNotificationAmount] = useState(0);
  const accountDisclosure = useDisclosure();
  const userInfo = useSessionStore((state) => state.getSession());
  if (!userInfo) return null;

  return (
    <Flex
      alignItems={'center'}
      position={'absolute'}
      top={'48px'}
      right={'48px'}
      cursor={'pointer'}
    >
      {/* notification */}
      <Flex
        w="32px"
        h="32px"
        borderRadius={'50%'}
        background={'rgba(244, 246, 248, 0.7)'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'relative'}
        boxShadow={'0px 1.2px 2.3px rgba(0, 0, 0, 0.2)'}
      >
        <Box onClick={() => setShowNotification((val) => !val)}>
          <Iconfont iconName="icon-notifications" width={20} height={20} color="#24282C"></Iconfont>
        </Box>
        {showNotification && (
          <Notification
            isShow={showNotification}
            onClose={() => setShowNotification(false)}
            onAmount={(amount) => setNotificationAmount(amount)}
          />
        )}
      </Flex>
      {/* user account */}
      <Flex
        w="32px"
        h="32px"
        mx="16px"
        borderRadius={'50%'}
        background={'rgba(244, 246, 248, 0.7)'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'relative'}
        boxShadow={'0px 1.2px 2.3px rgba(0, 0, 0, 0.2)'}
      >
        <Box
          onClick={accountDisclosure.isOpen ? accountDisclosure.onClose : accountDisclosure.onOpen}
        >
          {userInfo?.user?.avatar ? (
            <img
              width={32}
              height={32}
              style={{ borderRadius: '50%' }}
              src={userInfo?.user.avatar}
              alt="user avator"
            />
          ) : (
            <Iconfont iconName="icon-user" width={20} height={20} color="#24282C"></Iconfont>
          )}
        </Box>
        {accountDisclosure.isOpen && <Account accountDisclosure={accountDisclosure} />}
      </Flex>
    </Flex>
  );
}
