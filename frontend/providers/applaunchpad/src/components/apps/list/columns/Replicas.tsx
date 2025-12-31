import { memo } from 'react';
import { useTranslation } from 'next-i18next';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';

export const Replicas = memo<CellContext<AppListItemType, unknown>>(
  ({ row }) => {
    const { t } = useTranslation();
    const item = row.original;

    return (
      <div className="flex whitespace-nowrap font-normal text-zinc-600">
        <span>
          {t('Active')}: {item.activeReplicas}
        </span>
        {item.minReplicas !== item.maxReplicas && (
          <span>
            &ensp;/&ensp;{t('Total')}: {item.minReplicas}-{item.maxReplicas}
          </span>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.row.original.activeReplicas === next.row.original.activeReplicas &&
    prev.row.original.minReplicas === next.row.original.minReplicas &&
    prev.row.original.maxReplicas === next.row.original.maxReplicas
);

Replicas.displayName = 'Replicas';
