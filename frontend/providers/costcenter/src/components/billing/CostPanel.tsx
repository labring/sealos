import { cn } from '@sealos/shadcn-ui';
import { formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';

type CostPanelProps = {
  children: React.ReactNode;
  region?: string | null;
  workspace?: string | null;
  totalCost: number;
  className?: string;
};

export function CostPanel({ children, region, workspace, totalCost, className }: CostPanelProps) {
  const { t } = useTranslation();
  const displayTitle = (() => {
    if (!region && !workspace) {
      return t('common:total_cost');
    }
    if (region && !workspace) {
      return t('common:region_cost', { region });
    }
    if (region && workspace) {
      return t('common:region_workspace_cost', { region, workspace });
    }
    return t('common:total_cost');
  })();

  return (
    <div className={cn('[&>*]:mb-4', className)}>
      <div className="shadow-sm border border-r-0 border-t-0 bg-blue-50 text-sm flex p-4 justify-between rounded-xl rounded-r-none rounded-t-none items-center gap-16 sticky top-0 z-10">
        <div className="font-semibold">
          <span>{displayTitle}: </span>
          <span className="text-blue-600">
            <CurrencySymbol />
            <span>{formatMoney(totalCost).toFixed(2)}</span>
          </span>
        </div>

        {/* // [TODO] AI is currently not available */}
        {/* <div className="font-semibold">
          <Button variant="link" className="text-blue-600 p-0 h-fit">
            Questions about charges? Ask AI
          </Button>
        </div> */}
      </div>

      {children}
    </div>
  );
}
