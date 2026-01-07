import React, { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { CURRENCY } from '@/store/static';
import { useUserStore } from '@/store/user';
import { CurrencySymbol } from '@sealos/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@sealos/shadcn-ui/tooltip';
import { HelpCircle, Cpu, MemoryStick, HardDrive, HdmiPort, CircuitBoard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';

const PriceBox = ({
  cpu,
  memory,
  storage,
  nodeports,
  gpu,
  pods = [1, 1]
}: {
  cpu: number;
  memory: number;
  storage: number;
  nodeports: number;
  gpu?: {
    type: string;
    amount: number;
  };
  pods: [number, number];
}) => {
  const { t } = useTranslation();
  const { userSourcePrice } = useUserStore();

  const priceList = useMemo(() => {
    if (!userSourcePrice) return [];
    const cpuP = +((userSourcePrice.cpu * cpu * 24) / 1000).toFixed(2);
    const memoryP = +((userSourcePrice.memory * memory * 24) / 1024).toFixed(2);
    const storageP = +(userSourcePrice.storage * storage * 24).toFixed(2);
    const nodeportsP = +(userSourcePrice.nodeports * nodeports * 24).toFixed(2);

    const gpuP = (() => {
      if (!gpu) return 0;
      const item = userSourcePrice?.gpu?.find((item) => item.type === gpu.type);
      if (!item) return 0;
      return +(item.price * gpu.amount * 24).toFixed(2);
    })();

    const totalP = +(cpuP + memoryP + storageP + gpuP + nodeportsP).toFixed(2);

    return [
      { label: 'CPU', price: cpuP },
      { label: 'Memory', price: memoryP },
      { label: 'Storage', price: storageP },
      { label: 'nodeports', price: nodeportsP },
      ...(userSourcePrice?.gpu ? [{ label: 'GPU', price: gpuP }] : []),
      { label: 'TotalPrice', price: totalP, isTotal: true }
    ];
  }, [cpu, gpu, memory, nodeports, storage, userSourcePrice]);

  const formatPrice = (val: number) => {
    const min = (val * pods[0]).toFixed(2);
    const max = (val * pods[1]).toFixed(2);
    return pods[0] === pods[1] ? min : `${min} ~ ${max}`;
  };

  return (
    <Card>
      <CardHeader className="gap-0 py-4">
        <CardTitle className="text-base font-medium">
          {t('AnticipatedPrice')} <span className="font-normal text-zinc-400">{t('Perday')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        <TooltipProvider>
          {priceList.map((item) => (
            <div
              key={item.label}
              className={`flex justify-between py-3 px-5 items-center text-base text-zinc-900 border-b border-zinc-100 ${
                item.isTotal ? 'border-b-0 py-4' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-neutral-400 font-normal">
                {item.label === 'CPU' ? (
                  <Cpu className="h-5 w-5" />
                ) : item.label === 'Memory' ? (
                  <MemoryStick className="h-5 w-5" />
                ) : item.label === 'Storage' ? (
                  <HardDrive className="h-5 w-5" />
                ) : item.label === 'nodeports' ? (
                  <HdmiPort className="h-5 w-5" />
                ) : item.label === 'GPU' ? (
                  <CircuitBoard className="h-5 w-5" />
                ) : (
                  <></>
                )}
                <span className="text-zinc-900">{t(item.label)}</span>
                {item.isTotal && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 cursor-pointer text-neutral-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('total_price_tip')}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div
                className={`flex items-center font-medium leading-none text-zinc-600 ${
                  item.isTotal ? '!text-blue-600' : ''
                }`}
              >
                <CurrencySymbol type={CURRENCY} />
                <span>{formatPrice(item.price)}</span>
              </div>
            </div>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default PriceBox;
