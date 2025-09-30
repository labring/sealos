'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@sealos/shadcn-ui';
import { useUserStore } from '@/stores/user';

import { Progress } from '@sealos/shadcn-ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@sealos/shadcn-ui/tooltip';
import { Card, CardContent, CardHeader } from '@sealos/shadcn-ui/card';
import { resourcePropertyMap } from '@/constants/resource';

const QuotaBox = ({ className }: { className?: string }) => {
  const t = useTranslations();
  const { userQuota, loadUserQuota } = useUserStore();

  useQuery(['getUserQuota'], loadUserQuota);

  const quotaList = useMemo(() => {
    if (!userQuota) return [];

    return userQuota
      .filter((item) => item.limit > 0)
      .map((item) => {
        const { limit, used, type } = item;
        const unit = resourcePropertyMap[type]?.unit;
        const Icon = resourcePropertyMap[type]?.icon;
        const scale = resourcePropertyMap[type]?.scale;

        const tip = `${t('total')}: ${(limit / scale).toFixed(2)} ${unit}
${t('used')}: ${(used / scale).toFixed(2)} ${unit}
${t('remaining')}: ${((limit - used) / scale).toFixed(2)} ${unit}`;

        return { ...item, tip, Icon };
      });
  }, [userQuota, t]);

  if (userQuota.length === 0) return null;

  return (
    <Card className={cn('guide-cost', className)}>
      <CardHeader className="flex h-13 items-center gap-2 border-b-1 border-zinc-100">
        <span className="font-medium">{t('resource_quota')}</span>
      </CardHeader>
      <CardContent className="flex flex-col">
        {quotaList.map((item, index) => (
          <div
            key={item.type}
            className={cn(
              'flex h-12 items-center justify-between px-5',
              index !== quotaList.length - 1 && 'border-b-1 border-zinc-100'
            )}
          >
            <div className="flex items-center gap-2 text-zinc-900">
              <item.Icon className="h-5 w-5 text-neutral-400" />
              <span className="w-20 capitalize">{t(item.type)}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-full cursor-pointer items-center">
                  <Progress value={(item.used / item.limit) * 100} className="h-1 w-30" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={10}>
                <div className="text-xs leading-relaxed tracking-[0.048px] whitespace-pre text-zinc-900">
                  {item.tip}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default QuotaBox;
