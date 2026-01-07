import { memo } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { type CellContext } from '@tanstack/react-table';
import {
  MoreHorizontal,
  Play,
  Pause,
  PencilLine,
  Trash2,
  AlignLeft,
  IterationCw
} from 'lucide-react';

import { AppListItemType } from '@/types/app';
import { Button } from '@sealos/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@sealos/shadcn-ui/dropdown-menu';
import type { AppTableMeta } from '@/components/apps/appList';

export const Actions = memo<CellContext<AppListItemType, unknown>>(
  ({ row, table }) => {
    const { t } = useTranslation();
    const router = useRouter();
    const item = row.original;
    const { onPauseApp, onStartApp, onRestartApp, onDeleteApp, onUpdateApp } = table.options
      .meta as AppTableMeta;

    return (
      <div className="w-full flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="!px-3 !py-2 gap-2 font-medium text-secondary-foreground bg-secondary shadow-none"
          onClick={() => router.push(`/app/detail?name=${item.name}`)}
        >
          <AlignLeft className="h-4 w-4" />
          {t('Details')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-zinc-500 shadow-none">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="end">
            {item.isPause ? (
              <DropdownMenuItem onClick={() => onStartApp(item.name)}>
                <Play className="h-4 w-4" />
                <span>{t('Start Up')}</span>
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => onPauseApp(item.name)}>
                  <Pause className="h-4 w-4" />
                  <span>{t('Pause')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateApp(item)}>
                  <PencilLine className="h-4 w-4" />
                  <span>{t('Update')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRestartApp(item.name)}>
                  <IterationCw className="h-4 w-4" />
                  <span>{t('Restart')}</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteApp(item.name)}>
              <Trash2 className="h-4 w-4" />
              <span>{t('Delete')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
  (prev, next) =>
    prev.row.original.name === next.row.original.name &&
    prev.row.original.isPause === next.row.original.isPause
);

Actions.displayName = 'Actions';
