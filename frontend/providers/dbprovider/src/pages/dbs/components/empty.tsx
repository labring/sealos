import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { startDriver, applistDriverObj } from '@/hooks/driver';
import { useGuideStore } from '@/store/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { track } from '@sealos/gtm';
import { useUserStore } from '@/store/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { useQuery } from '@tanstack/react-query';
import { getWorkspaceSubscriptionInfo } from '@/api/platform';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';

const Empty = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isClientSide = useClientSideValue(true);
  const { loadUserQuota, checkExceededQuotas } = useUserStore();
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  const { applistCompleted } = useGuideStore();
  useEffect(() => {
    if (!applistCompleted && isClientSide) {
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
  }, [applistCompleted, t, router, isClientSide]);

  // load user quota on component mount
  useEffect(() => {
    if (quotaLoaded) return;

    loadUserQuota();
    setQuotaLoaded(true);
  }, [quotaLoaded, loadUserQuota]);

  // Fetch workspace subscription info
  const { data: subscriptionInfo } = useQuery({
    queryKey: ['workspaceSubscriptionInfo'],
    queryFn: () => getWorkspaceSubscriptionInfo(),
    refetchOnWindowFocus: false,
    retry: 1
  });

  const handleCreateApp = useCallback(() => {
    // Check quota before creating app
    const exceededQuotaItems = checkExceededQuotas({
      cpu: 1,
      memory: 1,
      // nodeport: 1,
      storage: 1,
      ...(subscriptionInfo?.subscription?.type === 'PAYG' ? {} : { traffic: 1 })
    });

    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      track('module_view', {
        module: 'database',
        view_name: 'create_form'
      });
      router.push('/db/edit');
    }
  }, [checkExceededQuotas, router, subscriptionInfo?.subscription?.type]);

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
      <Button className="create-app-btn" w={155} mt={5} variant={'solid'} onClick={handleCreateApp}>
        {t('create_db')}
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
          track('module_view', {
            module: 'database',
            view_name: 'create_form'
          });
          router.push('/db/edit');
        }}
      />
    </Box>
  );
};

export default Empty;
