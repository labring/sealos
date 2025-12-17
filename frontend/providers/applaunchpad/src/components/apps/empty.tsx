import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { useGuideStore } from '@/store/guide';
import { applistDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { useUserStore } from '@/store/user';
import { track } from '@sealos/gtm';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';

const Empty = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const { listCompleted } = useGuideStore();
  const isClientSide = useClientSideValue(true);
  const { loadUserQuota, checkExceededQuotas, session } = useUserStore();
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  useEffect(() => {
    if (!listCompleted && isClientSide) {
      startDriver(
        applistDriverObj(t, () => {
          router.push('/app/edit');
        })
      );
    }
  }, [listCompleted, router, t, isClientSide]);

  // load user quota on component mount
  useEffect(() => {
    if (quotaLoaded) return;

    loadUserQuota();
    setQuotaLoaded(true);
  }, [quotaLoaded, loadUserQuota]);

  const handleCreateApp = useCallback(() => {
    // Check quota before creating app
    const exceededQuotaItems = checkExceededQuotas({
      cpu: 1,
      memory: 1,
      nodeport: 1,
      storage: 1,
      ...(session?.subscription?.type === 'PAYG' ? {} : { traffic: 1 })
    });

    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      track('deployment_start', {
        module: 'applaunchpad'
      });
      router.push('/app/edit');
    }
  }, [checkExceededQuotas, router, session]);

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
        onClick={() => handleCreateApp()}
        leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#FFF'} />}
      >
        {t('Create Application')}
      </Button>

      <InsufficientQuotaDialog
        items={exceededQuotas}
        open={exceededDialogOpen}
        onOpenChange={(open) => {
          // Refresh quota on open change
          loadUserQuota();
          setExceededDialogOpen(open);
        }}
        onConfirm={() => {
          setExceededDialogOpen(false);
          track('deployment_start', {
            module: 'applaunchpad'
          });
          router.push('/app/edit');
        }}
      />
    </Box>
  );
};

export default Empty;
