import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { useGuideStore } from '@/store/guide';
import { applistDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';

const Empty = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const { listCompleted } = useGuideStore();
  const isClientSide = useClientSideValue(true);

  useEffect(() => {
    if (!listCompleted && isClientSide) {
      startDriver(
        applistDriverObj(t, () => {
          router.push('/app/edit');
        })
      );
    }
  }, [listCompleted, router, t, isClientSide]);

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
      <Box py={8}>{t("You haven't created any application yet")}</Box>
      <Button
        className="create-app-btn"
        w={155}
        mt={5}
        onClick={() => router.push('/app/edit')}
        leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#FFF'} />}
      >
        {t('Create Application')}
      </Button>
    </Box>
  );
};

export default Empty;
