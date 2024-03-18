import LangSelectSimple from '@/components/LangSelect/simple';
import { Flex, UseDisclosureReturn } from '@chakra-ui/react';
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
      <LangSelectSimple
        w="36px"
        h="36px"
        background={'rgba(244, 246, 248, 0.7)'}
        boxShadow={'0px 1.2px 2.3px rgba(0, 0, 0, 0.2)'}
      />
    </Flex>
  );
};

export default Language;
