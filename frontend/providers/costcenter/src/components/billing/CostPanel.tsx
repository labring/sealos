import { Button } from '@sealos/shadcn-ui/button';

type CostPanelProps = {
  children: React.ReactNode;
  displayTitle: string;
  totalCost: number;
};

export function CostPanel({ children, displayTitle, totalCost }: CostPanelProps) {
  return (
    <div className="[&>*]:mb-4">
      <div className="shadow-sm border border-r-0 border-t-0 bg-blue-50 text-sm flex p-4 justify-between rounded-xl rounded-r-none rounded-t-none items-center gap-16 sticky top-0 z-10">
        <div className="font-semibold">
          <span>{displayTitle}: </span>
          <span className="text-blue-600">${totalCost.toFixed(2)}</span>
        </div>

        <div className="font-semibold">
          <Button variant="link" className="text-blue-600 p-0 h-fit">
            Questions about charges? Ask AI
          </Button>
        </div>
      </div>

      {children}
    </div>
  );
}
