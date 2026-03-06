import { valuationMap } from '@/constants/payment';
import { getWorkspaceQuota } from '@/api/workspace';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
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
import { Quantity, Scale } from '@sealos/shared';
import { WorkspaceQuotaResponseSchema } from '@/types/workspace';

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

  // Parse response data using Zod schema to ensure Quantity instances are created
  const parsedData = data?.data ? WorkspaceQuotaResponseSchema.safeParse(data.data) : null;
  const quotaItems = parsedData?.success ? parsedData.data.quota : [];

  const quota = (filtersSelected ? quotaItems : [])
    .filter((item) => gpuEnabled || item.type !== 'gpu')
    .map((item) => {
      const mapping = valuationMap.get(item.type);

      // All quota values (limit, used, remain) are represented as Quantity.
      // After Zod parsing, these are guaranteed to be Quantity instances.
      const limit = item.limit;
      const used = item.used;
      const remain = limit.sub(used);

      // Calculate progress percentage based on raw value at Scale.None.
      const progressValue = limit.equals(Quantity.ZERO)
        ? 0
        : (Number(used.scaledValue(Scale.None)) / Number(limit.scaledValue(Scale.None))) * 100;

      return {
        type: item.type,
        icon: mapping?.icon,
        limit,
        used,
        remain,
        title: t(item.type),
        progressValue
      };
    });

  return (
    <TableLayout>
      <TableLayoutCaption className="text-sm">
        <div>{t('common:usage.title')}</div>
        <div className="flex">
          <RegionMenu className={{ trigger: 'w-36 rounded-r-none' }} />
          <NamespaceMenu className={{ trigger: 'w-36 rounded-l-none border-l-0' }} />
        </div>
      </TableLayoutCaption>

      <TableLayoutContent>
        <TableLayoutHeadRow>
          <TableHead className="w-1/5 bg-transparent">{t('common:resource_name')}</TableHead>
          <TableHead className="w-1/5 bg-transparent">{t('common:chart')}</TableHead>
          <TableHead className="w-1/5 bg-transparent">{t('common:total')}</TableHead>
          <TableHead className="w-1/5 bg-transparent">{t('common:used')}</TableHead>
          <TableHead className="w-1/5 bg-transparent">{t('common:remain')}</TableHead>
        </TableLayoutHeadRow>

        <TableLayoutBody>
          {quota.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground h-20">
                {t('common:please_select_a_specific_workspace')}
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
                  <Progress value={item.progressValue} className="h-1 w-4/5" />
                </TableCell>
                <TableCell>
                  <span>{item.limit.formatForDisplay({ format: 'BinarySI' })}</span>
                </TableCell>
                <TableCell>
                  <span>{item.used.formatForDisplay({ format: 'BinarySI' })}</span>
                </TableCell>
                <TableCell>
                  <span>{item.remain.formatForDisplay({ format: 'BinarySI' })}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableLayoutBody>
      </TableLayoutContent>
    </TableLayout>
  );
}
