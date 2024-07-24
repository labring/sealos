import { WorkOrderStatus, WorkOrderType } from '@/types/workorder';

export const OrderTypeList: {
  id: WorkOrderType;
  label: string;
}[] = [
  {
    id: WorkOrderType.AppLaunchpad,
    label: 'applaunchpad'
  },
  {
    id: WorkOrderType.CostCenter,
    label: 'costcenter'
  },
  {
    id: WorkOrderType.Template,
    label: 'template'
  },
  {
    id: WorkOrderType.DBProvider,
    label: 'dbprovider'
  },
  {
    id: WorkOrderType.CronJob,
    label: 'cronjob'
  },
  {
    id: WorkOrderType.CloudServer,
    label: 'cloudserver'
  },
  {
    id: WorkOrderType.ObjectStorage,
    label: 'objectstorage'
  },
  {
    id: WorkOrderType.FunctionServer,
    label: 'functionserver'
  },
  {
    id: WorkOrderType.AccountCenter,
    label: 'account_center'
  },
  {
    id: WorkOrderType.Other,
    label: 'other'
  }
];

export const StatusMap: {
  [key in WorkOrderStatus]: {
    label: string;
    value: WorkOrderStatus;
    color: string;
    backgroundColor: string;
    dotColor: string;
  };
} = {
  all: {
    label: 'Pending',
    value: WorkOrderStatus.All,
    color: '#FB7C3C',
    backgroundColor: '#FFF2EC',
    dotColor: '#FB7C3C'
  },
  pending: {
    label: 'Pending',
    value: WorkOrderStatus.Pending,
    color: '#FB7C3C',
    backgroundColor: '#FFF2EC',
    dotColor: '#FB7C3C'
  },
  processing: {
    label: 'Processing',
    value: WorkOrderStatus.Processing,
    color: '#219BF4',
    backgroundColor: '#EBF7FD',
    dotColor: '#219BF4'
  },
  completed: {
    label: 'Completed',
    value: WorkOrderStatus.Completed,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  deleted: {
    label: 'Deleted',
    value: WorkOrderStatus.Deleted,
    color: '#FF5B6E',
    backgroundColor: '#FFEBED',
    dotColor: '#FF5B6E'
  }
};
