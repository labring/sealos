import { ObjectId } from 'mongodb';

export type WorkOrderDB = {
  _id?: ObjectId; //
  userId: string; //
  orderId: string; //
  type: WorkOrderType;
  createTime: Date;
  updateTime: Date;
  completeTime?: Date;
  description: string;
  status: WorkOrderStatus;
  dialogs?: WorkOrderDialog[];
  appendix?: string[];
  manualHandling: {
    isManuallyHandled: boolean;
    handlingTime?: Date;
  };
};

export type WorkOrderDialog = {
  time: Date;
  content: string;
  userId: string;
  isAdmin: boolean;
  isAIBot: boolean;
};

export enum WorkOrderType {
  All = 'all',
  AppLaunchpad = 'applaunchpad',
  DBProvider = 'dbprovider',
  CostCenter = 'costcenter',
  CronJob = 'cronjob',
  Template = 'template',
  Other = 'other'
}

export type WorkOrderEditForm = {
  type: WorkOrderType;
  description: string;
};

export enum WorkOrderStatus {
  All = 'all',
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Deleted = 'deleted'
}
