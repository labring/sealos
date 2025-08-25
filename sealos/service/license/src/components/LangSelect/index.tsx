import { setCookie } from '@/utils/cookieUtils';
import { Flex, FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

export default function LangSelectSimple(props: FlexProps) {
  const { t, i18n } = useTranslation();

  return (
    <Flex
      userSelect={'none'}
      ml="auto"
      w="32px"
      h="32px"
      borderRadius={'50%'}
      justifyContent={'center'}
      alignItems={'center'}
      backgroundColor={'#FFF'}
      color={'#152539'}
      cursor={'pointer'}
      fontWeight={500}
      {...props}
      onClick={() => {
        setCookie('NEXT_LOCALE', i18n?.language === 'en' ? 'zh' : 'en', {
          expires: 30,
          sameSite: 'None',
          secure: true
        });
        i18n?.changeLanguage(i18n?.language === 'en' ? 'zh' : 'en');
      }}
    >
      {i18n?.language === 'en' ? 'En' : '中'}
    </Flex>
  );
}
