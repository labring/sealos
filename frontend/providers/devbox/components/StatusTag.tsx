import React from 'react';
import { CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { DevboxReleaseStatusMapType, DevboxStatusMapType } from '@/types/devbox';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatusTagProps {
  status: DevboxStatusMapType | DevboxReleaseStatusMapType;
  className?: string;
  isShutdown?: boolean;
}

const StatusTag = ({ status, isShutdown = false, className }: StatusTagProps) => {
  const label = status?.label;
  const t = useTranslations();

  return (
    <div className={cn('flex flex-shrink-0 items-center', className)}>
      <div className={'guide-status-tag flex h-5 items-center gap-2'}>
        <div
          className="aspect-square h-2 w-2 rounded-xs"
          style={{ backgroundColor: status.dotColor }}
        />
        <div className="flex flex-col">
          <span className={'text-sm/5 font-medium text-zinc-900'}>{t(label)}</span>
          {isShutdown && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center text-emerald-600">
                  <span className="text-xs/4">{t('saving')}&nbsp;</span>
                  <CircleHelp className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="w-[380px] p-4" side="bottom">
                <div className="flex flex-col gap-2">
                  <span className="text-sm/5 font-medium text-zinc-900">
                    {t('devbox_shutdown_notice1')}
                  </span>
                  <span className="text-xs/[16px] tracking-[0.048px] text-zinc-500">
                    {t.rich('devbox_shutdown_notice2', {
                      black: (chunks) => <span className="text-zinc-900">{chunks}</span>
                    })}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusTag;
