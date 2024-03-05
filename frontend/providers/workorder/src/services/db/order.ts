import { OrderDB, OrderDialog, OrderStatus, OrderType } from '@/types/order';
import { connectToDatabase } from './mongodb';
import { AuthAdmin } from '../backend/auth';

async function connectOrderCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<OrderDB>('order');
  return collection;
}

const getFilter = ({ userID, orderID }: { userID: string; orderID: string }) => {
  const isAdmin = AuthAdmin(userID);
  if (isAdmin) {
    return { orderID };
  }
  return { orderID, userID };
};

export async function createOrder({ order }: { order: OrderDB }) {
  const collection = await connectOrderCollection();
  const result = await collection.insertOne(order);
  return result;
}

export async function getAllOrdersForAdmin({ page, pageSize }: { page: number; pageSize: number }) {
  const collection = await connectOrderCollection();

  const skip = (page - 1) * pageSize;

  const query = {};
  const options = {
    skip: skip,
    limit: pageSize,
    sort: { createTime: -1 } as Record<string, 1 | -1>,
    projection: { _id: 0 }
  };

  const orders = await collection.find(query, options).toArray();
  const totalCount = await collection.countDocuments(query);

  return { orders, totalCount };
}

export async function getAllOrdersByUserID({
  userID,
  page,
  pageSize,
  orderType = 'all',
  startTime,
  endTime,
  orderStatus = 'all'
}: {
  userID: string;
  page: number;
  pageSize: number;
  orderType?: 'all' | OrderType;
  startTime?: Date;
  endTime?: Date;
  orderStatus?: 'all' | OrderStatus;
}) {
  const collection = await connectOrderCollection();

  const skip = (page - 1) * pageSize;

  const baseQuery = AuthAdmin(userID)
    ? { isDeleted: { $ne: true } }
    : { userID, isDeleted: { $ne: true } };

  let typeQuery = {};
  if (orderType !== 'all') {
    typeQuery = { type: orderType };
  }

  let timeQuery = {};

  if (startTime && endTime) {
    timeQuery = {
      createTime: {
        $gte: new Date(startTime),
        $lte: new Date(endTime)
      }
    };
  }

  let statusQuery = {};
  if (orderStatus !== 'all') {
    statusQuery = { status: orderStatus };
  }

  const query = { ...baseQuery, ...typeQuery, ...timeQuery, ...statusQuery };

  const options = {
    skip: skip,
    limit: pageSize,
    sort: { createTime: -1 } as Record<string, 1 | -1>,
    projection: { _id: 0 }
  };

  const orders = await collection.find(query, options).toArray();
  const totalCount = await collection.countDocuments(query);

  return { orders, totalCount };
}

export async function getOrderByOrderIdAndUserID({
  orderID,
  userID
}: {
  orderID: string;
  userID: string;
}) {
  const collection = await connectOrderCollection();

  const order = await collection.findOne(getFilter({ orderID, userID }));
  return order;
}

export async function updateOrder({
  orderID,
  userID,
  updates
}: {
  orderID: string;
  userID: string;
  updates: Partial<OrderDB>;
}) {
  const collection = await connectOrderCollection();

  const filter = getFilter({ orderID, userID });
  const update = {
    $set: {
      ...updates,
      updateTime: new Date()
    }
  };

  const result = await collection.updateOne(filter, update);
  return result;
}

export async function addDialogToOrder({
  orderID,
  userID,
  dialog
}: {
  orderID: string;
  userID: string;
  dialog: OrderDialog;
}) {
  const collection = await connectOrderCollection();

  const filter = getFilter({ orderID, userID });
  const update = {
    $push: {
      dialogs: dialog
    }
  };

  const result = await collection.updateOne(filter, update);

  return result;
}

export async function deleteOrder({ orderID, userID }: { orderID: string; userID: string }) {
  const collection = await connectOrderCollection();

  const filter = getFilter({ orderID, userID });
  const update = {
    $set: {
      isDeleted: true,
      updateTime: new Date()
    }
  };

  const result = await collection.updateOne(filter, update);
  return result;
}
