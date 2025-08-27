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

export type PAYGData = {
  appName: string;
  appType: string;
  cost: number;
  avatarFallback?: string;
};

type PAYGCostTableProps = {
  data: PAYGData[];
  timeRange?: string;
  onUsageClick?: (item: PAYGData) => void;
};

export function PAYGCostTable({ data, timeRange, onUsageClick }: PAYGCostTableProps) {
  const PAYGRow = ({ item }: { item: PAYGData }) => (
    <TableRow>
      <TableCell>
        <div className="flex gap-1 items-center">
          <Avatar className="size-5">
            <AvatarFallback>
              {item.avatarFallback || item.appName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>{item.appName}</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('font-medium')}>
          {item.appType}
        </Badge>
      </TableCell>
      <TableCell>${item.cost}</TableCell>
      <TableCell>
        <Button variant="outline" size="sm" onClick={() => onUsageClick?.(item)}>
          Usage
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <TableLayout className="border-r-0 rounded-r-none">
      <TableLayoutCaption className="font-medium text-sm bg-zinc-50">
        <div className="flex items-center gap-3">
          <h3>PAYG</h3>
          {timeRange && <div className="font-normal text-zinc-500">{timeRange}</div>}
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
          {data.map((item, index) => (
            <PAYGRow key={index} item={item} />
          ))}
        </TableLayoutBody>
      </TableLayoutContent>
    </TableLayout>
  );
}
