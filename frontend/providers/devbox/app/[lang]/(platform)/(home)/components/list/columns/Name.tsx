import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { PencilLine } from 'lucide-react';
import { type CellContext } from '@tanstack/react-table';

import { DevboxListItemTypeV2 } from '@/types/devbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { Separator } from '@sealos/shadcn-ui/separator';
import { RuntimeIcon } from '@/components/RuntimeIcon';

interface NameProps extends CellContext<DevboxListItemTypeV2, unknown> {
  onEditRemark: (item: DevboxListItemTypeV2) => void;
}

export const Name = memo<NameProps>(
  ({ row, onEditRemark }) => {
    const t = useTranslations();
    const item = row.original;

    return (
      <div className="flex w-full cursor-pointer items-center gap-2 pr-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-8 min-w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
              <RuntimeIcon
                iconId={item.template.templateRepository.iconId}
                icon={item.template.templateRepository.icon}
                alt={item.id}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" sideOffset={1}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[0.5px] border-zinc-200 bg-zinc-50">
                <RuntimeIcon
                  iconId={item.template.templateRepository.iconId}
                  icon={item.template.templateRepository.icon}
                  alt={item.id}
                />
              </div>
              <div className="flex flex-col">
                <p className="text-sm/5 font-medium">{item.template.templateRepository.iconId}</p>
                <p className="text-xs/5 text-zinc-500">{item.template.name}</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex w-full flex-1 flex-col leading-none">
              <div className="group flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>

                {!item.remark && (
                  <div
                    className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity select-none group-hover:opacity-100"
                    onClick={() => onEditRemark(item)}
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
                    onClick={() => onEditRemark(item)}
                  />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="mr-25 flex w-fit max-w-60 flex-col gap-2 p-4 text-sm/5"
          >
            <div>
              <div className="flex w-full gap-2">
                <span className="min-w-15 text-zinc-600">{t('name')}</span>
                <span className="break-all text-zinc-900">{item.name}</span>
              </div>
              {!!item.remark && (
                <>
                  <Separator className="bg-zinc-100" />
                  <div className="flex w-full gap-2">
                    <span className="min-w-15 text-zinc-600">{t('remark')}</span>
                    <div className="break-all text-zinc-900">{item.remark}</div>
                  </div>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  },
  (prev, next) =>
    prev.row.original.id === next.row.original.id &&
    prev.row.original.name === next.row.original.name &&
    prev.row.original.remark === next.row.original.remark
);

Name.displayName = 'Name';
