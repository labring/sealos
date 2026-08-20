import { Info } from 'lucide-react';
import { Alert, AlertDescription, cn } from '@sealos/shadcn-ui';
import { Trans, useTranslation } from 'next-i18next';

function formatBannerDate(dateStr: string, lang: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';

  if (lang?.startsWith('zh')) {
    return date
      .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      .replace(/\//g, '-');
  }

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function FreePlanExpiryBanner({ currentPeriodEndAt }: { currentPeriodEndAt: string }) {
  const { i18n } = useTranslation();
  const dateText = formatBannerDate(currentPeriodEndAt, i18n.language);

  return (
    <Alert className={cn('rounded-xl bg-orange-50 border-orange-400')}>
      <AlertDescription className={cn('flex items-center gap-3')}>
        <Info className={cn('size-5 text-orange-600')} />
        <span className={cn('w-full text-orange-600 text-sm leading-5')}>
          <Trans
            i18nKey="common:free_plan_expiry_banner"
            values={{ date: dateText }}
            components={[<span className="font-bold" key="date" />]}
          />
        </span>
      </AlertDescription>
    </Alert>
  );
}
