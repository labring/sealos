import { memo } from 'react';
import { useRouter } from '@/i18n';
import { useTranslations } from 'next-intl';
import {
  ArrowBigUpDash,
  Ellipsis,
  IterationCw,
  Pause,
  PencilLine,
  Play,
  SquareTerminal,
  Trash2
} from 'lucide-react';
import { type CellContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@sealos/shadcn-ui/dropdown-menu';
import IDEButton from '@/components/IDEButton';
import { Button } from '@sealos/shadcn-ui/button';
import { track } from '@sealos/gtm';

interface ActionsProps extends CellContext<DevboxListItemTypeV2, unknown> {
  onOpenRelease: (item: DevboxListItemTypeV2) => void;
  onGoToTerminal: (item: DevboxListItemTypeV2) => void;
  onStartDevbox: (item: DevboxListItemTypeV2) => void;
  onRestartDevbox: (item: DevboxListItemTypeV2) => void;
  onOpenShutdown: (item: DevboxListItemTypeV2) => void;
  onDeleteDevbox: (item: DevboxListItemTypeV2) => void;
}

export const Actions = memo<ActionsProps>(
  ({
    row,
    onOpenRelease,
    onGoToTerminal,
    onStartDevbox,
    onRestartDevbox,
    onOpenShutdown,
    onDeleteDevbox
  }) => {
    const router = useRouter();
    const t = useTranslations();
    const item = row.original;

    return (
      <div className="flex items-center justify-start gap-2">
        <IDEButton
          devboxName={item.name}
          sshPort={item.sshPort}
          status={item.status}
          runtimeType={item.template.templateRepository.iconId as string}
          leftButtonProps={{
            className: 'border-r-1 w-36 rounded-r-none px-2'
          }}
        />
        <Button
          variant="secondary"
          onClick={() => {
            router.push(`/devbox/detail/${item.name}`);
            track({
              event: 'deployment_details',
              module: 'devbox',
              context: 'app'
            });
          }}
        >
          {t('detail')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Ellipsis className="h-4 w-4 text-zinc-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="h-9" onClick={() => onOpenRelease(item)}>
              <ArrowBigUpDash className="h-4 w-4 text-neutral-500" />
              {t('release')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="h-9"
              disabled={item.status.value !== 'Running'}
              onClick={() => onGoToTerminal(item)}
            >
              <SquareTerminal className="h-4 w-4 text-neutral-500" />
              {t('terminal')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
              onClick={() => router.push(`/devbox/create?name=${item.name}&from=list`)}
            >
              <PencilLine className="h-4 w-4 text-neutral-500" />
              {t('update')}
            </DropdownMenuItem>
            {(item.status.value === 'Stopped' || item.status.value === 'Shutdown') && (
              <DropdownMenuItem
                className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                onClick={() => onStartDevbox(item)}
              >
                <Play className="h-4 w-4 text-neutral-500" />
                {t('start')}
              </DropdownMenuItem>
            )}
            {item.status.value !== 'Stopped' && item.status.value !== 'Shutdown' && (
              <DropdownMenuItem
                className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                onClick={() => onRestartDevbox(item)}
              >
                <IterationCw className="h-4 w-4 text-neutral-500" />
                {t('restart')}
              </DropdownMenuItem>
            )}
            {item.status.value === 'Running' && (
              <DropdownMenuItem
                className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
                onClick={() => onOpenShutdown(item)}
              >
                <Pause className="h-4 w-4 text-neutral-500" />
                {t('shutdown')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="flex h-9 cursor-pointer items-center rounded-md px-3 text-sm"
              onClick={() => onDeleteDevbox(item)}
            >
              <Trash2 className="h-4 w-4" />
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
  (prev, next) =>
    prev.row.original.id === next.row.original.id &&
    prev.row.original.status.value === next.row.original.status.value &&
    prev.row.original.sshPort === next.row.original.sshPort
);

Actions.displayName = 'Actions';
