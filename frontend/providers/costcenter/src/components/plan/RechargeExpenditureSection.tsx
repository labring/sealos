import { Skeleton } from '@sealos/shadcn-ui';
import { displayMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';

interface RechargeExpenditureSectionProps {
  expenditure: number | null;
  isLoading?: boolean;
  recharge: number | null;
}

export function RechargeExpenditureSection({
  recharge,
  expenditure,
  isLoading = false
}: RechargeExpenditureSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex items-center rounded-xl px-6 py-5 gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">{t('common:total_recharge')}</span>
          <AccountAmount isLoading={isLoading} value={recharge} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">{t('common:total_expenditure')}</span>
          <AccountAmount isLoading={isLoading} value={expenditure} />
        </div>
      </div>
    </div>
  );
}

function AccountAmount({ isLoading, value }: { isLoading: boolean; value: number | null }) {
  if (isLoading) {
    return <Skeleton className="h-7 w-28" />;
  }

  if (value === null) {
    return <span className="text-foreground text-2xl font-semibold leading-none">--</span>;
  }

  return (
    <span className="text-foreground text-2xl font-semibold leading-none">
      <CurrencySymbol className="size-5" />
      <span>{displayMoney(formatMoney(value))}</span>
    </span>
  );
}
