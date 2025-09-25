import { Button } from '@sealos/shadcn-ui';
import { displayMoney, formatMoney } from '@/utils/format';
import GiftCode from '@/components/cost_overview/components/GiftCode';

interface BalanceSectionProps {
  balance: number;
  rechargeEnabled: boolean;
  onTopUpClick: () => void;
}

export function BalanceSection({ balance, rechargeEnabled, onTopUpClick }: BalanceSectionProps) {
  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex justify-between items-center rounded-xl px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Balance</span>
          <span className="text-foreground text-2xl font-semibold leading-none">
            ${displayMoney(formatMoney(balance))}
          </span>
        </div>

        <div className="flex gap-4 items-center">
          <div className="w-20">
            <GiftCode />
          </div>
          {rechargeEnabled && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onTopUpClick();
              }}
            >
              Top Up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
