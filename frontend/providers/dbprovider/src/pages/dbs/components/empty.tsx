import React from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';

const Empty = () => {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Box
      className={styles.empty}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bg={'#F3F4F5'}
    >
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{t('database_empty')}</Box>
      <Button w={155} mt={5} variant={'solid'} onClick={() => router.push('/db/edit')}>
        {t('create_db')}
      </Button>
    </Box>
  );
};

export default Empty;
