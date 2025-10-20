import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import { cn } from '@sealos/shadcn-ui';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutContent,
  TableLayoutHeadRow,
  TableLayoutBody
} from '@sealos/shadcn-ui/table-layout';
import { Badge } from '@sealos/shadcn-ui/badge';
import { useTranslation } from 'next-i18next';
import { formatMoney } from '@/utils/format';

export type SubscriptionData = {
  time: string;
  plan: string;
  cost: number;
};

type SubscriptionCostTableProps = {
  data: SubscriptionData[];
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr)
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    .replace(/\//g, '/')
    .replace(',', ' ');
};

export function SubscriptionCostTable({ data }: SubscriptionCostTableProps) {
  const { t } = useTranslation();
  const SubscriptionRow = ({ item }: { item: SubscriptionData }) => (
    <TableRow>
      <TableCell>{formatDate(item.time)}</TableCell>
      <TableCell>
        <Badge className={cn('font-medium', 'bg-plan-starter text-blue-600')}>{item.plan}</Badge>
      </TableCell>
      <TableCell>${formatMoney(item.cost)}</TableCell>
    </TableRow>
  );

  return (
    <TableLayout className="border-r-0 rounded-r-none">
      <TableLayoutCaption className="font-medium text-sm bg-zinc-50">
        <h3>{t('common:subscription')}</h3>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead className="bg-transparent">{t('common:time')}</TableHead>
          <TableHead className="bg-transparent">{t('common:plan')}</TableHead>
          <TableHead className="bg-transparent">{t('common:cost')}</TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody>
          {data.map((item, index) => (
            <SubscriptionRow key={index} item={item} />
          ))}
        </TableLayoutBody>
      </TableLayoutContent>
    </TableLayout>
  );
}
