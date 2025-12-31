import { memo } from 'react';
import { useTranslation } from 'next-i18next';
import { PencilLine } from 'lucide-react';
import { type CellContext } from '@tanstack/react-table';

import { AppListItemType } from '@/types/app';

interface NameProps extends CellContext<AppListItemType, unknown> {
  onEditRemark: (appName: string) => void;
}

export const Name = memo<NameProps>(
  ({ row, onEditRemark }) => {
    const { t } = useTranslation();
    const item = row.original;

    return (
      <div className="flex w-full cursor-pointer items-center pr-4">
        <div className="flex w-full flex-1 flex-col leading-none">
          <div className="group flex items-center gap-1">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
              {item.name}
            </span>
            {!item.remark && (
              <div
                className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity select-none group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditRemark(item.name);
                }}
              >
                <PencilLine className="h-4 min-h-4 w-4 min-w-4 cursor-pointer text-neutral-500" />
                <span className="text-sm text-zinc-500">{t('set_remarks')}</span>
              </div>
            )}
          </div>
          {item.remark && (
            <div className="group flex w-[80%] items-center gap-1">
              <span className="truncate text-xs font-normal text-zinc-500">{item.remark}</span>
              <PencilLine
                className="h-4 min-h-4 w-4 min-w-4 cursor-pointer text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditRemark(item.name);
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.row.original.id === next.row.original.id &&
    prev.row.original.name === next.row.original.name &&
    prev.row.original.remark === next.row.original.remark
);

Name.displayName = 'Name';
