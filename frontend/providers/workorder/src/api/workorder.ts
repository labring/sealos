import { CreateWorkOrderParams } from '@/pages/api/workorder/create';
import { GET, POST } from '@/services/request';
import { WorkOrderDB, WorkOrderStatus, WorkOrderType } from '@/types/workorder';

export const createWorkOrder = (payload: CreateWorkOrderParams) =>
  POST<{ orderId: string }>('/api/workorder/create', payload);

export const getWorkOrderList = (payload: {
  page: number;
  pageSize: number;
  orderType?: WorkOrderType;
  orderStatus?: WorkOrderStatus;
  startTime?: Date;
  endTime?: Date;
}) => POST<{ totalCount: number; orders: WorkOrderDB[] }>('/api/workorder/listByUser', payload);

export const getWorkOrderById = (payload: { orderId: string }) =>
  GET<WorkOrderDB>('/api/workorder/getByID', payload);

export const delWorkOrderById = (payload: { orderId: string }) =>
  GET('/api/workorder/delete', payload);

export const updateWorkOrderById = (payload: { updates: Partial<WorkOrderDB>; orderId: string }) =>
  POST('/api/workorder/update', payload);

export const updateWorkOrderDialogById = (payload: {
  orderId: string;
  content: string;
  isRobot?: boolean;
}) => POST('/api/workorder/updateDialog', payload);
