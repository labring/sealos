import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { BookOpen, LayoutTemplate, Plus } from 'lucide-react';

import { useRouter } from '@/i18n';
import { useGuideStore } from '@/stores/guide';
import { useClientSideValue } from '@/hooks/useClientSideValue';
import { destroyDriver, startDriver, startGuide2 } from '@/hooks/driver';

import { Button } from '@/components/ui/button';
import { useGlobalStore } from '@/stores/global';

export default function Header() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  const { setLastRoute, setHeaderTitle } = useGlobalStore();
  const { guide2, setGuide2 } = useGuideStore();
  const isClientSide = useClientSideValue(true);
  useEffect(() => {
    if (!guide2 && isClientSide) {
      startDriver(
        startGuide2(t, () => {
          router.push('/devbox/create');
        })
      );
    }
  }, [guide2, router, t, isClientSide]);

  const handleGotoTemplate = () => {
    setHeaderTitle('devbox_template');
    router.push('/template?tab=public');
  };

  const handleCreateDevbox = () => {
    setGuide2(true);
    destroyDriver();
    setLastRoute('/');
    setHeaderTitle('select_runtime');
    router.push('/template?tab=public');
  };

  const handleGotoDocs = () => {
    if (locale === 'zh') {
      window.open('https://sealos.run/docs/overview/intro', '_blank');
    } else {
      window.open('https://sealos.io/docs/overview/intro', '_blank');
    }
  };

  return (
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
      <div className="flex items-center gap-3">
        <Button variant="outline" className="h-10 w-auto" onClick={handleGotoTemplate}>
          <LayoutTemplate className="h-4 w-4" />
          <span className="leading-5"> {t('scan_templates')}</span>
        </Button>
        {/* NOTE: About guide we should test it */}
        <Button className="h-10" onClick={handleCreateDevbox}>
          <Plus className="h-4 w-4" />
          <span className="leading-5">{t('create_devbox')}</span>
        </Button>
      </div>
    </div>
  );
}
