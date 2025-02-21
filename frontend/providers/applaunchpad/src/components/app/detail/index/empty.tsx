import React from 'react';
import { Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';

const Empty = () => {
  const { t } = useTranslation();
  return (
    <Box
      className={styles.empty}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{t('no_logs_for_now')}</Box>
    </Box>
  );
};

export default Empty;
