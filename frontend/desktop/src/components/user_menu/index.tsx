import Account from '@/components/account';
import Notification from '@/components/notification';
import useSessionStore from '@/stores/session';
import { Box, Flex, Image, useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';
import Iconfont from '../iconfont';
import LangSelect from '../LangSelect';
import { i18n } from 'next-i18next';

export default function Index() {
  const [notificationAmount, setNotificationAmount] = useState(0);
  const accountDisclosure = useDisclosure();
  const showDisclosure = useDisclosure();
  const switchLangDisclosure = useDisclosure();
  const userInfo = useSessionStore((state) => state.getSession());
  if (!userInfo) return null;
  const buttonList: { click?: () => void, button: JSX.Element, content: JSX.Element }[] = [
    {
      button: <Image
        width={'20px'}
        height={'20px'}
        borderRadius="full"
        src='/images/language.svg'
        fallbackSrc="/images/sealos.svg"
        alt="user avator"
      />,
      click: () => switchLangDisclosure.onOpen(),
      content: <LangSelect disclosure={switchLangDisclosure} i18n={i18n}/>
    },
    {
      button: <Iconfont iconName="icon-notifications" width={20} height={20} color="#24282C"></Iconfont>,
      click: () => showDisclosure.onOpen(),
      content: <Notification
        disclosure={showDisclosure}
        onAmount={(amount) => setNotificationAmount(amount)}
      />
    }, {
      button: <Image
        width={'36px'}
        height={'36px'}
        borderRadius="full"
        src={userInfo?.user?.avatar || ''}
        fallbackSrc="/images/sealos.svg"
        alt="user avator"
      />,
      click: () => accountDisclosure.onOpen(),
      content: <Account disclosure={accountDisclosure} />
    }
  ]
  return (
    <Flex
      alignItems={'center'}
      position={'absolute'}
      top={'42px'}
      right={'42px'}
      cursor={'pointer'}
      gap={'16px'}
    >
      {
        buttonList.map((item, index) => (<><Flex
          w="36px"
          h="36px"
          key={index}
          borderRadius={'50%'}
          background={'rgba(244, 246, 248, 0.7)'}
          justifyContent={'center'}
          alignItems={'center'}
          position={'relative'}
          boxShadow={'0px 1.2px 2.3px rgba(0, 0, 0, 0.2)'}
        >
          <Box onClick={item.click}>
            {item.button}
          </Box>
          {item.content}
        </Flex>
        </>
        ))
      }
    </Flex>
  );
}
