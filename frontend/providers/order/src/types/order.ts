import { ObjectId } from 'mongodb';

export type OrderDB = {
  _id?: ObjectId;
  userID: string;
  orderID: string;
  type: OrderType;
  createTime: Date;
  updateTime: Date;
  completeTime?: Date;
  description: string;
  status: OrderStatus;
  dialogs?: OrderDialog[];
  isDeleted?: boolean;
  appendix?: string[];
};

export type OrderDialog = {
  time: Date;
  content: string;
  userID: string;
  isAdmin: boolean;
};

export type OrderType =
  | 'applaunchpad'
  | 'dbprovider'
  | 'costcenter'
  | 'cronjob'
  | 'template'
  | 'other';

export type OrderEditForm = {
  type: OrderType;
  description: string;
};

export type FilterOrderType = 'all' | 'processing' | 'completed';

export type OrderStatus = 'pending' | 'processing' | 'completed';
