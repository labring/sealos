import LangSelect from '@/components/LangSelect';
import { Box, Flex, UseDisclosureReturn } from '@chakra-ui/react';
import { I18n } from 'next-i18next';

type LanguageType = { disclosure: UseDisclosureReturn; i18n: I18n | null };

const Language = ({ disclosure, i18n }: LanguageType) => {
  return (
    <Flex
      alignItems={'center'}
      position={'absolute'}
      top={'42px'}
      right={'42px'}
      cursor={'pointer'}
      gap={'16px'}
    >
      <Flex
        w="36px"
        h="36px"
        borderRadius={'50%'}
        background={'rgba(244, 246, 248, 0.7)'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'relative'}
        boxShadow={'0px 1.2px 2.3px rgba(0, 0, 0, 0.2)'}
      >
        <Box onClick={() => disclosure.onOpen()}>{i18n?.language === 'en' ? 'en' : '中'}</Box>
        <LangSelect disclosure={disclosure} i18n={i18n} />
      </Flex>
    </Flex>
  );
};

export default Language;
