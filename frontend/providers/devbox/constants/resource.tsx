import { UserQuotaItemType } from '@/types/user';
import { Cpu, CircuitBoard, HdmiPort, MemoryStick } from 'lucide-react';

export const resourcePropertyMap: Record<
  UserQuotaItemType['type'],
  {
    unit: string;
    icon: ({ className }: { className?: string }) => JSX.Element;
    scale: number;
  }
> = {
  cpu: {
    unit: 'Core',
    icon: ({ className }: { className?: string }) => <Cpu className={className} />,
    scale: 1000
  },
  memory: {
    unit: 'Gi',
    icon: ({ className }: { className?: string }) => <MemoryStick className={className} />,
    scale: 1024
  },
  nodeports: {
    unit: '',
    icon: ({ className }: { className?: string }) => <HdmiPort className={className} />,
    scale: 1
  },
  gpu: {
    unit: 'Card',
    icon: ({ className }: { className?: string }) => <CircuitBoard className={className} />,
    scale: 1
  }
};
