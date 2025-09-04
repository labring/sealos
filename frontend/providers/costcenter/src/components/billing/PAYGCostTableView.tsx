import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import { cn } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutContent,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutFooter
} from '@sealos/shadcn-ui/table-layout';
import { Badge } from '@sealos/shadcn-ui/badge';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';
import { useTranslation } from 'next-i18next';
import { AppIcon } from '../AppIcon';
import { formatMoney } from '@/utils/format';

export type PAYGData = {
  appName: string;
  appType: string; // String ID for both display and API queries (e.g., "DB")
  cost: number;
  namespace?: string;
};

type PAYGCostTableViewProps = {
  data: PAYGData[];
  timeRange?: string;
  onUsageClick?: (item: PAYGData) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

/**
 * Render-only PAYG table view.
 * Displays PAYG item rows with type badge, cost and action.
 */
export function PAYGCostTableView({
  data,
  timeRange,
  onUsageClick,
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  isLoading = false
}: PAYGCostTableViewProps) {
  const { t } = useTranslation('applist');

  const PAYGRow = ({ item }: { item: PAYGData }) => (
    <TableRow>
      <TableCell>
        <div className="flex gap-1 items-center">
          <AppIcon app={item.appType} className={{ avatar: 'size-5' }} />
          <div>{item.appName}</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('font-medium')}>
          {t(item.appType)}
        </Badge>
      </TableCell>
      <TableCell>${formatMoney(item.cost)}</TableCell>
      <TableCell>
        <Button variant="outline" size="sm" onClick={() => onUsageClick?.(item)}>
          Usage
        </Button>
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="flex gap-1 items-center">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-16 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-16 rounded" />
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
          {isLoading
            ? // Show skeleton rows during loading
              Array.from({ length: pageSize }, (_, index) => (
                <SkeletonRow key={`skeleton-${index}`} />
              ))
            : data.map((item, index) => <PAYGRow key={index} item={item} />)}
        </TableLayoutBody>
      </TableLayoutContent>

      <TableLayoutFooter>
        <div className="px-4 py-2 flex justify-between">
          <div className="flex items-center text-zinc-500">
            Total: {isLoading ? <Skeleton className="h-4 w-8 inline-block ml-1" /> : totalCount}
          </div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
            <span>
              <span>{pageSize}</span>
              <span className="text-zinc-500"> / Page</span>
            </span>
          </div>
        </div>
      </TableLayoutFooter>
    </TableLayout>
  );
}
