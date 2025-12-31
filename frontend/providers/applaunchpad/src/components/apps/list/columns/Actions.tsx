import { memo } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { type CellContext } from '@tanstack/react-table';
import { MoreHorizontal, Play, Pause, RefreshCw, Pencil, Trash2, AlignLeft } from 'lucide-react';

import { AppListItemType } from '@/types/app';
import { Button } from '@sealos/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sealos/shadcn-ui/dropdown-menu';

interface ActionsProps extends CellContext<AppListItemType, unknown> {
  onPauseApp: (appName: string) => void;
  onStartApp: (appName: string) => void;
  onRestartApp: (appName: string) => void;
  onDeleteApp: (appName: string) => void;
  onUpdateApp: (item: AppListItemType) => void;
}

export const Actions = memo<ActionsProps>(
  ({ row, onPauseApp, onStartApp, onRestartApp, onDeleteApp, onUpdateApp }) => {
    const { t } = useTranslation();
    const router = useRouter();
    const item = row.original;

    return (
      <div className="w-full flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="!px-3 !py-2 gap-2 font-medium text-secondary-foreground bg-secondary"
          onClick={() => router.push(`/app/detail?name=${item.name}`)}
        >
          <AlignLeft className="h-4 w-4" />
          {t('Details')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-zinc-500">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
                  <Pencil className="h-4 w-4" />
                  <span>{t('Update')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRestartApp(item.name)}>
                  <RefreshCw className="h-4 w-4" />
                  <span>{t('Restart')}</span>
                </DropdownMenuItem>
              </>
            )}
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
