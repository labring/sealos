import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BookOpen,
  LayoutTemplate,
  Plus,
  Search,
  FolderArchive,
  Package,
  Github
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n';
import { useEnvStore } from '@/stores/env';
import { useGuideStore } from '@/stores/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { destroyDriver, startDriver, startGuide2 } from '@/hooks/driver';

import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sealos/shadcn-ui/dropdown-menu';
import { useUserStore } from '@/stores/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { InsufficientQuotaDialog } from '@/components/dialogs/InsufficientQuotaDialog';
import type { ImportType } from '@/types/import';
import GitImportDrawer from '@/components/drawers/GitImportDrawer';
import LocalImportDrawer from '@/components/drawers/LocalImportDrawer';

export default function Header({ onSearch }: { onSearch: (value: string) => void }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const { env } = useEnvStore();
  const { guide2, setGuide2 } = useGuideStore();
  const isClientSide = useClientSideValue(true);

  const userStore = useUserStore();
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);
  const [importDrawerType, setImportDrawerType] = useState<ImportType | null>(null);

  // load user quota on load
  useEffect(() => {
    if (quotaLoaded) return;

    userStore.loadUserQuota();
    setQuotaLoaded(true);
  }, [quotaLoaded, userStore]);

  const handleGotoTemplate = useCallback(() => {
    router.push('/template?tab=public');
  }, [router]);

  const handleGotoDocs: any = () => {
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
      cpu: 1,
      memory: 1,
      ...(userStore.session?.subscription?.type === 'PAYG' ? {} : { traffic: 1 })
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

  const handleOpenImportDrawer = useCallback(
    (type: ImportType) => {
      const exceededQuotaItems = userStore.checkExceededQuotas({
        cpu: 4,
        memory: 8,
        ...(userStore.session?.subscription?.type === 'PAYG' ? {} : { traffic: 1 })
      });

      if (exceededQuotaItems.length > 0) {
        setExceededQuotas(exceededQuotaItems);
        setExceededDialogOpen(true);
        return;
      }

      setImportDrawerType(type);
    },
    [userStore]
  );

  const handleImportSuccess = useCallback(
    (devboxName: string) => {
      setImportDrawerType(null);
      router.push(`/devbox/detail/${devboxName}`);
    },
    [router]
  );

  useEffect(() => {
    if (!guide2 && isClientSide) {
      startDriver(startGuide2(t, handleCreateDevbox));
    }
  }, [guide2, isClientSide, handleCreateDevbox, t]);

  useEffect(() => {
    const from = searchParams.get('from');
    if (from === 'import' && isClientSide) {
      setImportDrawerType('git');
    }
  }, [searchParams, isClientSide]);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="list-create-app-button h-10 gap-2">
                <Plus className="h-4 w-4" />
                <span className="leading-5">{t('create_devbox')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 space-y-1 p-2">
              <p className="px-1 py-1.5 text-xs font-medium text-zinc-500">
                {t('creation_method')}
              </p>
              <DropdownMenuItem
                onClick={handleCreateDevbox}
                className="cursor-pointer rounded-lg px-2 py-2.5 hover:bg-zinc-100 focus:bg-zinc-100"
              >
                <Package className="mr-2 h-4 w-4 text-zinc-500" />
                <span className="text-sm font-normal text-zinc-900">{t('choose_runtime')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenImportDrawer('git')}
                className="cursor-pointer rounded-lg px-2 py-2.5 hover:bg-zinc-100 focus:bg-zinc-100"
              >
                <Github className="mr-2 h-4 w-4 text-zinc-500" />
                <span className="text-sm font-normal text-zinc-900">{t('import_from_git')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenImportDrawer('local')}
                className="cursor-pointer rounded-lg px-2 py-2.5 hover:bg-zinc-100 focus:bg-zinc-100"
              >
                <FolderArchive className="mr-2 h-4 w-4 text-zinc-500" />
                <span className="text-sm font-normal text-zinc-900">{t('import_from_local')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <InsufficientQuotaDialog
        items={exceededQuotas}
        open={exceededDialogOpen}
        onOpenChange={(open) => {
          userStore.loadUserQuota();
          setExceededDialogOpen(open);
        }}
        onConfirm={handleGotoTemplate}
      />

      <GitImportDrawer
        open={importDrawerType === 'git'}
        onClose={() => setImportDrawerType(null)}
        onSuccess={handleImportSuccess}
      />

      <LocalImportDrawer
        open={importDrawerType === 'local'}
        onClose={() => setImportDrawerType(null)}
        onSuccess={handleImportSuccess}
      />
    </>
  );
}
