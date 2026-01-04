import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';
import { useTranslation } from 'next-i18next';
import { useGuideStore } from '@/store/guide';
import { applistDriverObj, startDriver } from '@/hooks/driver';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { track } from '@sealos/gtm';
import { useQuotaGuarded } from '@sealos/shared';
import { Button } from '@sealos/shadcn-ui/button';
import { Plus } from 'lucide-react';

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

  const handleCreateApp = useQuotaGuarded(
    {
      requirements: {
        cpu: 1,
        memory: 1,
        nodeport: 1,
        storage: 1,
        traffic: true
      },
      immediate: false,
      allowContinue: true
    },
    () => {
      track('deployment_start', {
        module: 'applaunchpad'
      });
      router.push('/app/edit');
    }
  );

  return (
    <div className="flex h-full flex-col items-center justify-center bg-zinc-100">
      <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
      <div className="py-8">{t("You haven't created any application yet")}</div>
      <Button
        className="create-app-btn mt-5 w-[155px] bg-neutral-950 text-primary-foreground"
        onClick={() => handleCreateApp()}
      >
        <Plus className="h-5 w-5" />
        {t('Create Application')}
      </Button>
    </div>
  );
};

export default Empty;
