import { memo } from 'react';
import { useTranslation } from 'next-i18next';
import { Search } from 'lucide-react';

export const EmptyList = memo(() => {
  const { t } = useTranslation();

  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-3">
      <div className="rounded-lg border border-dashed border-zinc-200 p-2">
        <Search className="h-6 w-6 text-zinc-400" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-semibold text-center text-sm text-black">{t('No Applications')}</span>
        <span className="text-center text-sm/5 text-neutral-500">
          {t('Create your first application')}
        </span>
      </div>
    </div>
  );
});

EmptyList.displayName = 'EmptyList';
