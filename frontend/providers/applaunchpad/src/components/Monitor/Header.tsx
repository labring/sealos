import MyIcon from '@/components/Icon';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import DynamicTime from './Time';

export default function Header() {
  const { t } = useTranslation();

  return (
    <Flex alignItems={'center'}>
      <MyIcon name="monitor" width={'24px'} height={'24px'} color={'grayModern.900'} />
      <Text ml={'9px'} fontSize={'16px'} fontWeight={'bold'} color={'grayModern.900'}>
        {t('monitor')}
      </Text>
      <Flex
        flexShrink={0}
        ml={'12px'}
        fontSize={'12px'}
        color={'grayModern.600'}
        fontWeight={'400'}
        alignItems={'center'}
      >
        ({t('Update Time')} <DynamicTime />)
      </Flex>
    </Flex>
  );
}
