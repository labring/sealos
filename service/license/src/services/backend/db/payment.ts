import { LicenseRecordPayload, PaymentDB, PaymentStatus, TPayMethod } from '@/types';
import { connectToDatabase } from './mongodb';
import { createLicenseRecord, generateLicenseToken } from './license';

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
    }
  );

  return result;
}

export async function updatePaymentAndIssueLicense({
  uid,
  orderID,
  status,
  amount,
  quota,
  payMethod
}: {
  uid: string;
  orderID: string;
  status: PaymentStatus;
  amount: number;
  quota: number;
  payMethod: TPayMethod;
}) {
  const db = await connectToDatabase();
  const session = db.startSession();

  // const transactionOptions = {
  //   readConcern: { level: 'majority' },
  //   writeConcern: { w: 'majority' },
  //   readPreference: 'primary',
  // }

  try {
    session.startTransaction();
    console.log('事务状态：', session.transaction);
    await updatePaymentStatus({
      uid: uid,
      orderID: orderID,
      status: status
    });

    // 在事务中执行生成许可证记录操作
    const _token = generateLicenseToken({ type: 'Account', data: { amount: amount } });
    const record = {
      uid: uid,
      amount: amount,
      token: _token,
      orderID: orderID,
      quota: quota,
      payMethod: payMethod
    };
    await createLicenseRecord(record);

    await session.commitTransaction();
  } catch (err) {
    console.log(`[MongoDB transaction] ERROR: ${err}`);
    await session.abortTransaction();
  } finally {
    await session.endSession();
    console.log('事务状态：', session.transaction);
  }
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
