import { displayMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';

interface RechargeExpenditureSectionProps {
  recharge: number;
  expenditure: number;
}

export function RechargeExpenditureSection({
  recharge,
  expenditure
}: RechargeExpenditureSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex items-center rounded-xl px-6 py-5 gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">{t('common:total_recharge')}</span>
          <span className="text-foreground text-2xl font-semibold leading-none">
            <CurrencySymbol className="size-5" />
            <span>{displayMoney(formatMoney(recharge))}</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">{t('common:total_expenditure')}</span>
          <span className="text-foreground text-2xl font-semibold leading-none">
            <CurrencySymbol className="size-5" />
            <span>{displayMoney(formatMoney(expenditure))}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
