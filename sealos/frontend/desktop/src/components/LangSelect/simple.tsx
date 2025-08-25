import { Flex, FlexProps } from '@chakra-ui/react';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';

export default function LangSelectSimple(props: FlexProps) {
  const { currentLanguage, switchLanguage } = useLanguageSwitcher();

  return (
    <Flex
      flexShrink={0}
      userSelect={'none'}
      w="36px"
      h="36px"
      border={'1px solid '}
      borderColor={'#0000000D'}
      borderRadius={'50%'}
      justifyContent={'center'}
      alignItems={'center'}
      backgroundColor={'#FFF'}
      color={'primary'}
      cursor={'pointer'}
      fontWeight={500}
      fontSize={'14px'}
      _hover={{
        background: 'secondary'
      }}
      {...props}
      onClick={() => switchLanguage(currentLanguage === 'en' ? 'zh' : 'en')}
    >
      {currentLanguage === 'en' ? 'En' : '中'}
    </Flex>
  );
}
