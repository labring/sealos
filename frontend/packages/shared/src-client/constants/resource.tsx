import {
  CpuIcon,
  CircuitBoardIcon,
  HardDriveIcon,
  HdmiPortIcon,
  MemoryStickIcon,
  NetworkIcon
} from 'lucide-react';
import type { WorkspaceQuotaItemType } from '../types/workspace';

export interface ResourceIconProps {
  className?: string;
  size?: number;
}

export const resourcePropertyMap: Record<
  WorkspaceQuotaItemType,
  {
    unit: string;
    icon: (props: ResourceIconProps) => JSX.Element;
    scale: number;
  }
> = {
  cpu: {
    unit: 'Core',
    icon: ({ className, size = 20 }: ResourceIconProps) => (
      <CpuIcon className={className} size={size} />
    ),
    scale: 1000
  },
  memory: {
    unit: 'Gi',
    icon: ({ className, size = 20 }: ResourceIconProps) => (
      <MemoryStickIcon className={className} size={size} />
    ),
    scale: 1024
  },
  nodeport: {
    unit: '',
    icon: ({ className, size = 20 }: ResourceIconProps) => (
      <HdmiPortIcon className={className} size={size} />
    ),
    scale: 1
  },
  gpu: {
    unit: 'Card',
    icon: ({ className, size = 20 }: ResourceIconProps) => (
      <CircuitBoardIcon className={className} size={size} />
    ),
    scale: 1
  },
  storage: {
    unit: 'Gi',
    icon: ({ className, size = 20 }: ResourceIconProps) => (
      <HardDriveIcon className={className} size={size} />
    ),
    scale: 1024
  },
  traffic: {
    unit: 'Gi',
    icon: ({ className, size = 20 }: ResourceIconProps) => (
      <NetworkIcon className={className} size={size} />
    ),
    scale: 1024 * 1024 * 1024
  }
};
