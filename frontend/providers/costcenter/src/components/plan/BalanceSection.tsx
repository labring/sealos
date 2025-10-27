import { Button } from '@sealos/shadcn-ui';
import { displayMoney, formatMoney } from '@/utils/format';
import GiftCode from '@/components/cost_overview/components/GiftCode';
import { useTranslation } from 'next-i18next';

interface BalanceSectionProps {
  balance: number;
  rechargeEnabled: boolean;
  onTopUpClick: () => void;
}

export function BalanceSection({ balance, rechargeEnabled, onTopUpClick }: BalanceSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex justify-between items-center rounded-xl px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">{t('common:balance')}</span>
          <span className="text-foreground text-2xl font-semibold leading-none">
            ${displayMoney(formatMoney(balance))}
          </span>
        </div>

        <div className="flex gap-4 items-center">
          <GiftCode />
          {rechargeEnabled && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onTopUpClick();
              }}
            >
              {t('common:top_up')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
