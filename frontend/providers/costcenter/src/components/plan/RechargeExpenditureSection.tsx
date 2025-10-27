import { displayMoney, formatMoney } from '@/utils/format';

interface RechargeExpenditureSectionProps {
  recharge: number;
  expenditure: number;
}

export function RechargeExpenditureSection({
  recharge,
  expenditure
}: RechargeExpenditureSectionProps) {
  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex items-center rounded-xl px-6 py-5 gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Recharge</span>
          <span className="text-foreground text-2xl font-semibold leading-none">
            ${displayMoney(formatMoney(recharge))}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Expenditure</span>
          <span className="text-foreground text-2xl font-semibold leading-none">
            ${displayMoney(formatMoney(expenditure))}
          </span>
        </div>
      </div>
    </div>
  );
}
