import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, Box } from '@chakra-ui/react';
import styles from './empty.module.scss';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { useUserStore } from '@/store/user';
import useEnvStore from '@/store/env';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';
import { WorkspaceQuotaItem } from '@/types/workspace';

const Empty = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { checkExceededQuotas, session, loadUserQuota } = useUserStore();
  const { SystemEnv } = useEnvStore();
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  // Load user quota on component mount
  useEffect(() => {
    loadUserQuota();
  }, [loadUserQuota]);

  const handleCreateApp = useCallback(() => {
    // Check quota before creating app
    const exceededQuotaItems = checkExceededQuotas({
      cpu: SystemEnv.podCpuRequest,
      memory: SystemEnv.podMemoryRequest,
      ...(session?.subscription?.type === 'PAYG' ? {} : { traffic: 1 })
    });

    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      router.push('/job/edit');
    }
  }, [checkExceededQuotas, router, session, SystemEnv]);

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
      <Box py={8}>{t('job.You have no tasks yet')}</Box>
      <Button w={155} mt={5} variant={'primary'} onClick={handleCreateApp}>
        {t('job.create')}
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
          router.push('/job/edit');
        }}
      />
    </Box>
  );
};

export default Empty;
