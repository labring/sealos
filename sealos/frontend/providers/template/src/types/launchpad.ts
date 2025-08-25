import { StatusMapType } from './status';

export interface AppListItemType {
  id: string;
  name: string;
  status: StatusMapType;
  isPause: boolean;
  createTime: string;
  cpu: number;
  memory: number;
  activeReplicas: number;
  minReplicas: number;
  maxReplicas: number;
  storeAmount: number;
}
