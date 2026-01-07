import React, { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';
import { Progress } from '@sealos/shadcn-ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';
import { Cpu, MemoryStick, HardDrive, CircuitBoard, HdmiPort, ArrowUpDown } from 'lucide-react';

import { useUserQuota, resourcePropertyMap } from '@sealos/shared';

const iconMap: Record<string, React.ReactNode> = {
  cpu: <Cpu className="h-5 w-5" />,
  memory: <MemoryStick className="h-5 w-5" />,
  storage: <HardDrive className="h-5 w-5" />,
  gpu: <CircuitBoard className="h-5 w-5" />,
  nodeport: <HdmiPort className="h-5 w-5" />,
  traffic: <ArrowUpDown className="h-5 w-5" />
};

const QuotaBox = () => {
  const { t } = useTranslation();
  const { userQuota } = useUserQuota();

  const quotaList = useMemo(() => {
    if (!userQuota) return [];

    return userQuota
      .filter((item) => item.limit > 0)
      .map((item) => {
        const { limit, used, type } = item;
        const unit = resourcePropertyMap[type]?.unit;
        const scale = resourcePropertyMap[type]?.scale;

        const tip = `${t('Total')}: ${(limit / scale).toFixed(2)} ${unit}
${t('common.Used')}: ${(used / scale).toFixed(2)} ${unit}
${t('common.Surplus')}: ${((limit - used) / scale).toFixed(2)} ${unit}`;

        const percentage = Math.min((used / limit) * 100, 100);

        return { ...item, tip, percentage };
      });
  }, [userQuota, t]);

  return userQuota.length === 0 ? null : (
    <Card>
      <CardHeader className="gap-0 py-4">
        <CardTitle className="text-base font-medium">{t('app.Resource Quota')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        <TooltipProvider>
          {quotaList.map((item, index) => (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center justify-between gap-3 py-3 px-5 cursor-pointer text-base text-zinc-900 border-b border-zinc-100 ${
                    index === quotaList.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-neutral-400">{iconMap[item.type]}</span>
                    <span>{t(item.type)}</span>
                  </div>
                  <Progress value={item.percentage} className="w-30 h-1 bg-neutral-200" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="rounded-xl">
                <p className="text-sm text-zinc-900 font-normal p-2 whitespace-pre-line leading-[1.75rem]">
                  {item.tip}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default QuotaBox;
