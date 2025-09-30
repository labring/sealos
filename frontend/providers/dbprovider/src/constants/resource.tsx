import { WorkspaceQuotaItem } from '@/types/workspace';
import { Cpu, CircuitBoard, HardDrive, HdmiPort, MemoryStick, Network } from 'lucide-react';

export const resourcePropertyMap: Record<
  WorkspaceQuotaItem['type'],
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
  nodeport: {
    unit: '',
    icon: ({ className }: { className?: string }) => <HdmiPort className={className} />,
    scale: 1
  },
  gpu: {
    unit: 'Card',
    icon: ({ className }: { className?: string }) => <CircuitBoard className={className} />,
    scale: 1
  },
  storage: {
    unit: 'Gi',
    icon: ({ className }: { className?: string }) => <HardDrive className={className} />,
    scale: 1024
  },
  traffic: {
    unit: 'Gi',
    icon: ({ className }: { className?: string }) => <Network className={className} />,
    scale: 1024 * 1024 * 1024
  }
};
