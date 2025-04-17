import { Box, Flex } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import MyIcon from '@/components/Icon';
import { useRouter } from '@/i18n';

const Empty = () => {
  const router = useRouter();
  const t = useTranslations();
  return (
    <Flex
      // className={styles.empty}
      w={'full'}
      flex={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bg={'#F3F4F5'}
    >
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{t('devbox_empty')}</Box>
    </Flex>
  );
};

export default Empty;
