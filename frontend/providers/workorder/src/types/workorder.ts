import { ObjectId } from 'mongodb';
import { UserDB } from './user';

export type WorkOrderDB = {
  _id?: ObjectId; // only
  userId: string; // only
  orderId: string; // only
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
  userInfo: UserDB;
  closedBy?: string;
  deletedBy?: string;
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
  Cronjob = 'cronjob',
  CloudServer = 'cloudserver',
  ObjectStorage = 'objectstorage',
  FunctionServer = 'functionserver',
  FastGPT = 'fastgpt',
  AccountCenter = 'account_center',
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
