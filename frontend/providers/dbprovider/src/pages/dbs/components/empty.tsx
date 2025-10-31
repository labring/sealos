import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { startDriver, applistDriverObj } from '@/hooks/driver';
import { useGuideStore } from '@/store/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { track } from '@sealos/gtm';

const Empty = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isClientSide = useClientSideValue(true);

  const { applistCompleted, _hasHydrated } = useGuideStore();
  useEffect(() => {
    if (!applistCompleted && isClientSide && _hasHydrated) {
      startDriver(
        applistDriverObj(t, () => {
          track('module_view', {
            module: 'database',
            view_name: 'create_form'
          });
          router.push('/db/edit');
        })
      );
    }
  }, [applistCompleted, t, router, isClientSide, _hasHydrated]);

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
        onClick={() => {
          track('module_view', {
            module: 'database',
            view_name: 'create_form'
          });
          router.push('/db/edit');
        }}
      >
        {t('create_db')}
      </Button>
    </Box>
  );
};

export default Empty;
