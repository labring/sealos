import { WorkOrderDB, WorkOrderDialog, WorkOrderStatus, WorkOrderType } from '@/types/workorder';
import { connectToDatabase } from './mongodb';
import { getUserById } from './user';

async function connectOrderCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<WorkOrderDB>('order');
  return collection;
}

async function isAdminFilter({ userId, orderId }: { userId: string; orderId: string }) {
  const user = await getUserById(userId);
  if (user?.isAdmin) {
    return { orderId };
  }
  return { orderId, userId };
}

export async function createOrder({ order }: { order: WorkOrderDB }) {
  const collection = await connectOrderCollection();
  const result = await collection.insertOne(order);
  return result;
}

export async function getAllOrdersByUserId({
  userId,
  page,
  pageSize,
  orderType = WorkOrderType.All,
  startTime,
  endTime,
  orderStatus = WorkOrderStatus.All
}: {
  userId: string;
  page: number;
  pageSize: number;
  orderType?: WorkOrderType;
  startTime?: Date;
  endTime?: Date;
  orderStatus?: WorkOrderStatus;
}) {
  const collection = await connectOrderCollection();

  const skip = (page - 1) * pageSize;
  const user = await getUserById(userId);

  const baseQuery = user?.isAdmin ? {} : { userId, status: { $ne: WorkOrderStatus.Deleted } };

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

export async function getOrderByOrderIdAndUserId({
  orderId,
  userId
}: {
  orderId: string;
  userId: string;
}) {
  const collection = await connectOrderCollection();
  const filter = await isAdminFilter({ orderId, userId });
  const order = await collection.findOne(filter);
  return order;
}

export async function updateOrder({
  orderId,
  userId,
  updates
}: {
  orderId: string;
  userId: string;
  updates: Partial<WorkOrderDB>;
}) {
  const collection = await connectOrderCollection();

  const filter = await isAdminFilter({ orderId, userId });
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
  orderId,
  userId,
  dialog
}: {
  orderId: string;
  userId: string;
  dialog: WorkOrderDialog;
}) {
  const collection = await connectOrderCollection();

  const filter = await isAdminFilter({ orderId, userId });
  const update = {
    $push: {
      dialogs: dialog
    }
  };

  const result = await collection.updateOne(filter, update);

  return result;
}

export async function deleteOrder({ orderId, userId }: { orderId: string; userId: string }) {
  const collection = await connectOrderCollection();

  const filter = await isAdminFilter({ orderId, userId });
  const update = {
    $set: {
      status: 'deleted' as WorkOrderStatus,
      updateTime: new Date()
    }
  };

  const result = await collection.updateOne(filter, update);
  return result;
}
