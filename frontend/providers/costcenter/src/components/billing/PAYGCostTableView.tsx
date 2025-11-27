import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
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
import CurrencySymbol from '../CurrencySymbol';
import { FilledChevronDown } from '../Icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@sealos/shadcn-ui/dropdown-menu';
import { AppType } from '@/types/app';

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
  selectedAppType: AppType | null;
  onAppTypeSelected?: (appType: AppType | null) => void;
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
  isLoading = false,
  selectedAppType,
  onAppTypeSelected
}: PAYGCostTableViewProps) {
  const { t } = useTranslation();

  const PAYGRow = ({ item }: { item: PAYGData }) => (
    <TableRow className="h-[50px]">
      <TableCell>
        <div className="flex gap-1 items-center">
          <AppIcon app={item.appType} className={{ avatar: 'size-5' }} />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-[12ch] truncate">
                {item.appName || t('applist:' + item.appType)}
              </div>
            </TooltipTrigger>
            <TooltipContent>{item.appName || t('applist:' + item.appType)}</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('font-medium')}>
          {t('applist:' + item.appType)}
        </Badge>
      </TableCell>
      <TableCell>
        <CurrencySymbol />
        <span>{formatMoney(item.cost)}</span>
      </TableCell>
      <TableCell>
        <Button variant="outline" size="sm" onClick={() => onUsageClick?.(item)}>
          {t('common:payg_cost_table.view_app_usage_button')}
        </Button>
      </TableCell>
    </TableRow>
  );

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="flex gap-2 items-center">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-4 w-full" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-full rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-full rounded" />
      </TableCell>
    </TableRow>
  );

  return (
    <TableLayout className="border-r-0 rounded-r-none">
      <TableLayoutCaption className="font-medium text-sm bg-zinc-50">
        <div className="flex items-center gap-3">
          <h3>{t('common:payg_cost_table.title')}</h3>
          {timeRange && <div className="font-normal text-zinc-500">{timeRange}</div>}
        </div>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead className="w-[20ch] bg-transparent">{t('common:item')}</TableHead>
          <TableHead className="w-[18ch] bg-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <div className="flex gap-1 items-center">
                  {t('common:orders.type')}
                  <div
                    className={cn('size-5', selectedAppType ? 'text-blue-600' : 'text-zinc-400')}
                  >
                    <FilledChevronDown />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={selectedAppType || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      onAppTypeSelected?.(null);
                    } else {
                      onAppTypeSelected?.(value as AppType);
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="all">
                    {t('applist:all_app_type')}
                  </DropdownMenuRadioItem>
                  {Object.values(AppType).map((appType) => (
                    <DropdownMenuRadioItem key={appType} value={appType}>
                      {t('applist:' + appType)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableHead>
          <TableHead className="w-[16ch] bg-transparent">{t('common:cost')}</TableHead>
          <TableHead className="bg-transparent">{t('common:orders.action')}</TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody className="h-[calc(50px*10))]">
          {isLoading
            ? // Show skeleton rows during loading
              Array.from({ length: pageSize }, (_, index) => (
                <SkeletonRow key={`skeleton-${index}`} />
              ))
            : data.length > 0 && [
                ...data.map((item, index) => <PAYGRow key={`data-${index}`} item={item} />),
                ...Array.from({ length: pageSize - data.length }).map((_, index) => (
                  <tr key={`placeholder-${index}`} className="h-[50px] border-none" />
                ))
              ]}
          {!isLoading && data.length <= 0 && (
            <tr>
              <td colSpan={4}>
                <div className="flex justify-center items-center w-full px-12 py-6 text-zinc-500">
                  {t('no_data_available')}
                </div>
              </td>
            </tr>
          )}
        </TableLayoutBody>
      </TableLayoutContent>

      <TableLayoutFooter>
        <div className="px-4 py-2 flex justify-between">
          <div className="flex items-center text-zinc-500">
            {t('common:total')}:{' '}
            {isLoading ? <Skeleton className="h-4 w-8 inline-block ml-1" /> : totalCount}
          </div>
          <div className="flex items-center gap-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
            <span>
              <span>{pageSize}</span>
              <span className="text-zinc-500"> / {t('common:page')}</span>
            </span>
          </div>
        </div>
      </TableLayoutFooter>
    </TableLayout>
  );
}
