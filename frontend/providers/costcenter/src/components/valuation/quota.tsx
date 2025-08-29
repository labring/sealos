import { valuationMap } from '@/constants/payment';
import { getWorkspaceQuota } from '@/api/workspace';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { WorkspaceQuotaResponse, UserQuotaItem } from '@/types/workspace';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import CpuIcon from '../icons/CpuIcon';
import GpuIcon from '../icons/GpuIcon';
import { MemoryIcon } from '../icons/MemoryIcon';
import { StorageIcon } from '../icons/StorageIcon';
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
  const { data } = useQuery(
    ['quota', regionUid, workspace],
    () => getWorkspaceQuota({ regionUid, workspace }),
    { enabled: Boolean(regionUid) && Boolean(workspace) }
  );
  const { gpuEnabled } = useEnvStore();
  const quota: (UserQuotaItem & { unit?: string; bg?: string; remain: number; title: string })[] = (
    Boolean(regionUid) && Boolean(workspace)
      ? (data?.data as WorkspaceQuotaResponse | undefined)?.quota || []
      : []
  )
    .filter((d) => gpuEnabled || d.type !== 'gpu')
    .flatMap((d) => {
      const entity = valuationMap.get(d.type);
      if (!entity) {
        return [];
      }
      const _limit = Number.parseInt(d.limit * 1000 + '');
      const _used = Number.parseInt(d.used * 1000 + '');
      return [
        {
          ...d,
          limit: _limit / 1000,
          used: _used / 1000,
          remain: (_limit - _used) / 1000,
          title: t(d.type),
          unit: t(entity.unit),
          bg: entity.bg
        }
      ];
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
                    {item.type === 'cpu' ? (
                      <CpuIcon color={'var(--color-gray-400)'} boxSize={'20px'} />
                    ) : item.type === 'memory' ? (
                      <MemoryIcon color={'var(--color-gray-400)'} boxSize={'20px'} />
                    ) : item.type === 'storage' ? (
                      <StorageIcon color={'var(--color-gray-400)'} boxSize={'20px'} />
                    ) : item.type === 'gpu' ? (
                      <GpuIcon color={'var(--color-gray-400)'} boxSize={'20px'} />
                    ) : (
                      <></>
                    )}
                    <span>{t(item.type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Progress value={100 * (item.used / item.limit)} className="h-1" />
                </TableCell>
                <TableCell>
                  <span>{item.limit}</span>
                  <span> </span>
                  <span>{item.unit}</span>
                </TableCell>
                <TableCell>
                  <span>{item.used}</span>
                  <span> </span>
                  <span>{item.unit}</span>
                </TableCell>
                <TableCell>
                  <span>{item.remain}</span>
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
