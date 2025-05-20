import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { startDriver, applistDriverObj } from '@/hooks/driver';
import { useGuideStore } from '@/store/guide';

const Empty = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const { applistCompleted } = useGuideStore();
  useEffect(() => {
    if (!applistCompleted) {
      startDriver(applistDriverObj(t, () => router.push('/db/edit')));
    }
  }, [applistCompleted, t, router]);

  return (
    <Box
      className={styles.empty}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={'white'}
      px={'32px'}
      h={'full'}
      w={'full'}
      borderRadius={'xl'}
    >
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <Box py={8}>{t('database_empty')}</Box>
      <Button
        className="create-app-btn"
        w={155}
        mt={5}
        variant={'solid'}
        onClick={() => router.push('/db/edit')}
      >
        {t('create_db')}
      </Button>
    </Box>
  );
};

export default Empty;
