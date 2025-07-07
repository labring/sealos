import { useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { useRouter } from '@/i18n';

import { useGlobalStore } from '@/stores/global';

const Header = () => {
  const router = useRouter();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  console.log('from', from);

  const { lastRoute } = useGlobalStore();

  const handleBack = useCallback(() => {
    router.replace(lastRoute);
  }, [lastRoute, router]);

  const title = useMemo(() => {
    return from === 'home' ? t('select_runtime') : t('devbox_template');
  }, [from, t]);

  return (
    <div className="flex h-24 w-full items-center justify-between self-stretch border-b-1 px-10 py-8">
      <div className="flex cursor-pointer items-center gap-3" onClick={handleBack}>
        <ArrowLeft className="h-6 w-6" />
        <p className="text-2xl/8 font-semibold">{title}</p>
      </div>
    </div>
  );
};

export default Header;
