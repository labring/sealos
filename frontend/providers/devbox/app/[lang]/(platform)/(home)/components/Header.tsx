import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { BookOpen, LayoutTemplate, Plus, Search } from 'lucide-react';

import { useRouter } from '@/i18n';
import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { destroyDriver, startDriver, startGuide2 } from '@/hooks/driver';

import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { useUserStore } from '@/stores/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { InsufficientQuotaDialog } from '@/components/dialogs/InsufficientQuotaDialog';

export default function Header({ onSearch }: { onSearch: (value: string) => void }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { env } = useEnvStore();
  const { guide2, setGuide2 } = useGuideStore();
  const isClientSide = useClientSideValue(true);

  const userStore = useUserStore();
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  // load user quota on load
  useEffect(() => {
    if (quotaLoaded) return;

    userStore.loadUserQuota();
    setQuotaLoaded(true);
  }, [quotaLoaded, userStore]);

  const handleGotoTemplate = useCallback(() => {
    router.push('/template?tab=public');
  }, [router]);

  const handleGotoDocs = () => {
    if (locale === 'zh') {
      window.open(env.documentUrlZH, '_blank');
    } else {
      window.open(env.documentUrlEN, '_blank');
    }
  };

  const handleCreateDevbox = useCallback((): void => {
    setGuide2(true);
    destroyDriver();

    const exceededQuotaItems = userStore.checkExceededQuotas({
      cpu: 0,
      memory: 0
    });

    console.log('exceededQuotaItems', exceededQuotaItems);
    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      handleGotoTemplate();
    }
  }, [setGuide2, handleGotoTemplate, userStore]);

  useEffect(() => {
    if (!guide2 && isClientSide) {
      startDriver(startGuide2(t, handleCreateDevbox));
    }
  }, [guide2, isClientSide, handleCreateDevbox, t]);

  return (
    <>
      <div className="flex h-24 w-full flex-shrink-0 items-center justify-between">
        {/* left side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <span className="text-2xl/8 font-semibold">DevBox</span>
          </div>
          <div
            className="flex cursor-pointer items-center gap-2 text-blue-600"
            onClick={handleGotoDocs}
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm/5 font-medium">{t('docs')}</span>
          </div>
        </div>
        {/* right side */}
        <div className="flex items-center gap-3 !overflow-visible">
          <Input
            placeholder={t('search_name_and_remark_placeholder')}
            icon={<Search className="h-4 w-4 text-zinc-500" />}
            className="h-10 w-64 bg-white"
            onChange={(e) => onSearch(e.target.value)}
          />
          <Button variant="outline" className="h-10 w-auto" onClick={handleGotoTemplate}>
            <LayoutTemplate className="h-4 w-4" />
            <span className="leading-5"> {t('scan_templates')}</span>
          </Button>
          <Button className="list-create-app-button h-10" onClick={handleCreateDevbox}>
            <Plus className="h-4 w-4" />
            <span className="leading-5">{t('create_devbox')}</span>
          </Button>
        </div>
      </div>

      <InsufficientQuotaDialog
        items={exceededQuotas}
        open={exceededDialogOpen}
        onOpenChange={(open) => {
          // Refresh quota on open change
          userStore.loadUserQuota();
          setExceededDialogOpen(open);
        }}
        onConfirm={handleGotoTemplate}
      />
    </>
  );
}
