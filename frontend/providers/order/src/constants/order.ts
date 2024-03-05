import { OrderStatus, OrderType } from '@/types/order';

export const OrderTypeList: {
  id: OrderType;
  label: string;
}[] = [
  {
    id: 'applaunchpad',
    label: 'applaunchpad'
  },
  {
    id: 'costcenter',
    label: 'costcenter'
  },
  {
    id: 'template',
    label: 'template'
  },
  {
    id: 'dbprovider',
    label: 'dbprovider'
  }
];

export const StatusMap: {
  [key in OrderStatus]: {
    label: string;
    value: OrderStatus;
    color: string;
    backgroundColor: string;
    dotColor: string;
  };
} = {
  pending: {
    label: 'Pending',
    value: 'pending',
    color: '#FB7C3C',
    backgroundColor: '#FFF2EC',
    dotColor: '#FB7C3C'
  },
  processing: {
    label: 'Processing',
    value: 'processing',
    color: '#219BF4',
    backgroundColor: '#EBF7FD',
    dotColor: '#219BF4'
  },
  completed: {
    label: 'Completed',
    value: 'completed',
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  }
};
