import { PaymentDB, PaymentStatus, TPayMethod } from '@/types';
import { connectToDatabase } from './mongodb';

async function connectPaymentCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<PaymentDB>('payment');
  return collection;
}

export async function createPaymentRecord(payload: PaymentDB) {
  const collection = await connectPaymentCollection();
  const result = await collection.insertOne(payload);
  return result;
}

export async function getPaymentByID({ uid, orderID }: { uid: string; orderID: string }) {
  const collection = await connectPaymentCollection();
  const query = {
    uid,
    orderID
  };
  const paymentRecord = await collection.findOne(query);
  return paymentRecord;
}

export async function updatePaymentStatus({
  uid,
  orderID,
  status
}: {
  uid: string;
  orderID: string;
  status: PaymentStatus;
}) {
  const collection = await connectPaymentCollection();

  const result = await collection.findOneAndUpdate(
    {
      uid,
      orderID
    },
    {
      $set: {
        status: status,
        updatedAt: new Date()
      }
    },
    {
      projection: {
        status: 1,
        orderID: 1,
        message: 1
      }
    }
  );

  return result;
}

export async function findRecentNopayOrder({
  uid,
  payMethod,
  status
}: {
  uid: string;
  payMethod: TPayMethod;
  status: PaymentStatus;
}) {
  const collection = await connectPaymentCollection();

  const query = {
    uid: uid,
    status: status,
    payMethod: payMethod
  };

  const recentNopayOrder = await collection.findOne(query, {
    sort: {
      createdAt: -1
    },
    limit: 1
  });

  return recentNopayOrder;
}
