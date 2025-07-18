import { useMemo } from 'react';
import { CurrencySymbol } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { CircuitBoard, Cpu, HdmiPort, MemoryStick } from 'lucide-react';

import { cn } from '@/lib/utils';
import { usePriceStore } from '@/stores/price';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const colorMap = {
  cpu: '#33BABB',
  memory: '#36ADEF',
  nodeports: '#8172D8'
};

interface PriceBoxProps {
  components: {
    cpu: number;
    memory: number;
    gpu?: {
      type: string;
      amount: number;
    };
  }[];
  className?: string;
}

const PriceBox = ({ components = [], className }: PriceBoxProps) => {
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();

  const priceList: {
    icon?: React.ReactNode;
    label: string;
    value: string;
  }[] = useMemo(() => {
    let cp = 0;
    let mp = 0;
    let pp = 0;
    let tp = 0;
    let gp = 0;

    components.forEach(({ cpu, memory, gpu }) => {
      cp = (sourcePrice.cpu * cpu * 24) / 1000;
      mp = (sourcePrice.memory * memory * 24) / 1024;
      pp = sourcePrice.nodeports * 1 * 24;

      gp = (() => {
        if (!gpu || !gpu.amount) return 0;
        const item = sourcePrice?.gpu?.find((item) => item.type === gpu.type);
        if (!item) return 0;
        return +(item.price * gpu.amount * 24);
      })();

      tp = cp + mp + pp + gp;
    });
    const iconClassName = 'h-5 w-5 text-neutral-400';

    return [
      {
        icon: <Cpu className={iconClassName} />,
        label: 'cpu',
        value: cp.toFixed(2)
      },
      {
        icon: <MemoryStick className={iconClassName} />,
        label: 'memory',
        color: '#36ADEF',
        value: mp.toFixed(2)
      },
      {
        icon: <HdmiPort className={iconClassName} />,
        label: 'nodeports',
        value: pp.toFixed(2)
      },
      ...(sourcePrice?.gpu
        ? [
            {
              icon: <CircuitBoard className={iconClassName} />,
              label: 'GPU',
              value: gp.toFixed(2)
            }
          ]
        : []),
      { label: 'total_price', value: tp.toFixed(2) }
    ];
  }, [components, sourcePrice.cpu, sourcePrice.memory, sourcePrice.nodeports, sourcePrice.gpu]);

  return (
    <Card className={cn('guide-cost', className)}>
      <CardHeader className="flex h-13 items-center gap-2 border-b-1 border-zinc-100">
        <span className="font-medium">{t('estimated_price')}</span>
        <span className="font-medium text-zinc-400">{t('daily')}</span>
      </CardHeader>
      <CardContent className="flex flex-col">
        {priceList.map((item, index) => (
          <div
            key={item?.label}
            className={cn(
              'flex h-12 items-center justify-between px-5 py-6',
              index !== priceList.length - 1 && 'border-b-1 border-zinc-100'
            )}
          >
            <div className="flex h-full items-center gap-2 text-zinc-900">
              {item.icon}
              <span>{t(item?.label)}</span>
            </div>
            <div
              className={cn(
                'flex items-center font-medium text-zinc-600',
                index === priceList.length - 1 && 'text-blue-600'
              )}
            >
              <CurrencySymbol width={16} height={16} />
              &nbsp;
              {item.value}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PriceBox;
