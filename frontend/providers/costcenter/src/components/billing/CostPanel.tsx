import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import { Avatar, AvatarFallback } from '@sealos/shadcn-ui/avatar';
import { cn } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutContent,
  TableLayoutHeadRow,
  TableLayoutBody
} from '@sealos/shadcn-ui/table-layout';
import { Badge } from '@sealos/shadcn-ui/badge';

export function CostPanel() {
  const ExampleSubsRow = () => (
    <TableRow>
      <TableCell>2024-12-14 16:00</TableCell>
      <TableCell>
        <Badge className={cn('font-medium', 'bg-plan-starter text-blue-600')}>STARTER</Badge>
      </TableCell>
      <TableCell>$5</TableCell>
    </TableRow>
  );
  const ExamplePAYGRow = () => (
    <TableRow>
      <TableCell>
        <div className="flex gap-1 items-center">
          <Avatar className="size-5">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div>App Name</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('font-medium')}>
          App Launchpad
        </Badge>
      </TableCell>
      <TableCell>$5</TableCell>
      <TableCell>
        <Button variant="outline" size="sm">
          Usage
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="[&>*]:mb-4">
      <div className="shadow-sm border border-r-0 border-t-0 bg-blue-50 text-sm flex p-4 justify-between rounded-xl rounded-r-none rounded-t-none items-center gap-16 sticky top-0 z-10">
        <div className="font-semibold">
          <span>Hangzhou / Sealos-test Cost: </span>
          <span className="text-blue-600">$5</span>
        </div>

        <div className="font-semibold">
          <Button variant="link" className="text-blue-600 p-0 h-fit">
            Questions about charges? Ask AI
          </Button>
        </div>
      </div>

      <TableLayout className="border-r-0 rounded-r-none">
        <TableLayoutCaption className="font-medium text-sm bg-zinc-50">
          <h3>Subscription</h3>
        </TableLayoutCaption>

        <TableLayoutContent>
          <TableLayoutHeadRow>
            <TableHead className="bg-transparent">Time</TableHead>
            <TableHead className="bg-transparent">Plan</TableHead>
            <TableHead className="bg-transparent">Cost</TableHead>
          </TableLayoutHeadRow>

          <TableLayoutBody>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
            <ExampleSubsRow></ExampleSubsRow>
          </TableLayoutBody>
        </TableLayoutContent>
      </TableLayout>

      <TableLayout className="border-r-0 rounded-r-none">
        <TableLayoutCaption className="font-medium text-sm bg-zinc-50">
          <div className="flex items-center gap-3">
            <h3>PAYG</h3>
            <div className="font-normal text-zinc-500">2025-01-20 10:15 – 2025-01-20 10:45</div>
          </div>
        </TableLayoutCaption>

        <TableLayoutContent>
          <TableLayoutHeadRow>
            <TableHead className="bg-transparent">Item</TableHead>
            <TableHead className="bg-transparent">Type</TableHead>
            <TableHead className="bg-transparent">Cost</TableHead>
            <TableHead className="bg-transparent">Action</TableHead>
          </TableLayoutHeadRow>

          <TableLayoutBody>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
            <ExamplePAYGRow></ExamplePAYGRow>
          </TableLayoutBody>
        </TableLayoutContent>
      </TableLayout>
    </div>
  );
}
