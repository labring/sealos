import {
  InvoicesCollection,
  RechargeBillingItem,
  Tbilling,
  TInvoiceContract,
  TInvoiceDetail
} from '@/types';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';

async function connectToUserCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<InvoicesCollection>('invoices');
  await collection.createIndex({ 'billings.order_id': 1 }, { unique: true });
  return collection;
}
// amount 传真实的金额
export async function addInvoice({
  detail,
  contract,
  k8s_user,
  billings
}: {
  billings: Tbilling[];
  detail: TInvoiceDetail;
  contract: TInvoiceContract;
  k8s_user: string;
}) {
  const invoices = await connectToUserCollection();

  const result = await invoices.insertOne({
    detail,
    contract,
    k8s_user,
    billings,
    amount: billings.reduce((pre, cur) => pre + cur.amount, 0),
    createdTime: new Date()
  });
  return result;
}
export async function getAllInvoicesByK8sUser({ k8s_user }: { k8s_user: string }) {
  const invoices = await connectToUserCollection();
  const result = invoices.find({
    k8s_user
  });
  return result.toArray();
}
