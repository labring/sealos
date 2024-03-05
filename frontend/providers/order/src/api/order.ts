import { CreateOrderParams } from '@/pages/api/order/create';
import { GET, POST } from '@/services/request';
import { OrderDB, OrderStatus, OrderType } from '@/types/order';

export const createOrder = (payload: CreateOrderParams) => POST('/api/order/create', payload);

export const getOrderList = (payload: {
  page: number;
  pageSize: number;
  orderType?: 'all' | OrderType;
  orderStatus?: 'all' | OrderStatus;
  startTime?: Date;
  endTime?: Date;
}) => POST<{ totalCount: number; orders: OrderDB[] }>('/api/order/listByUser', payload);

export const getOrderById = (payload: { orderID: string }) =>
  GET<OrderDB>('/api/order/getByID', payload);

export const delOrderById = (payload: { orderID: string }) => GET('/api/order/delete', payload);

export const updateOrderById = (payload: { updates: Partial<OrderDB>; orderID: string }) =>
  POST('/api/order/update', payload);

export const updateOrderDialogById = (payload: { orderID: string; content: string }) =>
  POST('/api/order/updateDialog', payload);
