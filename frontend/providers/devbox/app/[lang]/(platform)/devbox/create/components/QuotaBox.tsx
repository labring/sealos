'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CircuitBoard, Cpu, HdmiPort, MemoryStick } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user';

import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const sourceMap = {
  cpu: {
    unit: 'Core',
    icon: (className: string) => <Cpu className={className} />
  },
  memory: {
    unit: 'Gi',
    icon: (className: string) => <MemoryStick className={className} />
  },
  nodeports: {
    unit: '',
    icon: (className: string) => <HdmiPort className={className} />
  },
  gpu: {
    unit: 'Card',
    icon: (className: string) => <CircuitBoard className={className} />
  }
};

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
        const unit = sourceMap[type]?.unit;
        const icon = sourceMap[type]?.icon;
        const tip = `${t('total')}: ${limit} ${unit}
${t('used')}: ${used.toFixed(2)} ${unit}
${t('remaining')}: ${(limit - used).toFixed(2)} ${unit}`;

        return { ...item, tip, icon };
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
              {item.icon && item.icon('h-5 w-5 text-neutral-400')}
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
