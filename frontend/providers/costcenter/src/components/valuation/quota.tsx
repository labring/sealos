import { valuationMap } from '@/constants/payment';
import { getWorkspaceQuota } from '@/api/workspace';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TableCell, TableRow, TableHead } from '@sealos/shadcn-ui/table';
import { Progress } from '@sealos/shadcn-ui/progress';
import {
  TableLayout,
  TableLayoutBody,
  TableLayoutCaption,
  TableLayoutContent,
  TableLayoutHeadRow
} from '@sealos/shadcn-ui/table-layout';
import RegionMenu from '../menu/RegionMenu';
import NamespaceMenu from '../menu/NamespaceMenu';

export default function Quota() {
  const { t } = useTranslation();
  const region = useBillingStore((s) => s.getRegion());
  const namespace = useBillingStore((s) => s.getNamespace());
  const regionUid = region?.uid || '';
  const workspace = namespace?.[0] || '';
  const filtersSelected = Boolean(regionUid) && Boolean(workspace);
  const { data } = useQuery(
    ['quota', regionUid, workspace],
    () => getWorkspaceQuota({ regionUid, workspace }),
    { enabled: filtersSelected }
  );
  const { gpuEnabled } = useEnvStore();

  const quota = (filtersSelected ? (data?.data?.quota ?? []) : [])
    .filter((item) => gpuEnabled || item.type !== 'gpu')
    .map((item) => {
      const mapping = valuationMap.get(item.type);

      return {
        type: item.type,
        icon: mapping?.icon,
        limit: item.limit,
        used: item.used,
        remain: item.limit - item.used,
        scale: mapping?.scale ?? 1,
        title: t(item.type),
        unit: mapping?.unit ? t(mapping?.unit) : ''
      };
    });

  return (
    <TableLayout>
      <TableLayoutCaption className="text-sm">
        <div>{t('Usage')}</div>
        <div className="flex">
          <RegionMenu className={{ trigger: 'w-36 rounded-r-none' }} />
          <NamespaceMenu className={{ trigger: 'w-36 rounded-l-none border-l-0' }} />
        </div>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead className="bg-transparent">{t('Resource Name')}</TableHead>
          <TableHead className="bg-transparent">{t('Chart')}</TableHead>
          <TableHead className="bg-transparent">{t('Total')}</TableHead>
          <TableHead className="bg-transparent">{t('Used')}</TableHead>
          <TableHead className="bg-transparent">{t('Remain')}</TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody>
          {quota.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground h-20">
                {t('Please select a specific workspace')}
              </TableCell>
            </TableRow>
          ) : (
            quota.map((item) => (
              <TableRow key={item.type}>
                <TableCell className="h-14">
                  <div className="flex items-center gap-2">
                    {item.icon && <item.icon size={20} strokeWidth={1} className="text-gray-400" />}
                    <span>{t(item.type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Progress value={100 * (item.used / item.limit)} className="h-1" />
                </TableCell>
                <TableCell>
                  <span>{(item.limit / item.scale).toFixed(2)}</span>
                  <span> </span>
                  <span>{item.unit}</span>
                </TableCell>
                <TableCell>
                  <span>{(item.used / item.scale).toFixed(2)}</span>
                  <span> </span>
                  <span>{item.unit}</span>
                </TableCell>
                <TableCell>
                  <span>{(item.remain / item.scale).toFixed(2)}</span>
                  <span> </span>
                  <span>{item.unit}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableLayoutBody>
      </TableLayoutContent>
    </TableLayout>
  );
}
