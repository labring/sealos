import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, WithId } from 'mongodb';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { Prisma } from '@prisma/client/extension';

export type TInvoiceDetail = {
  title: string;
  tax: string;
  bank: string;
  bankAccount: string;
  address?: string;
  phone?: string;
  fax?: string;
};
export type TInvoiceContract = {
  person: string;
  phone: string;
  email: string;
};

export type Tbilling = {
  order_id: string;
  amount: number;
  createdTime: Date;
};

export type InvoicesCollection = {
  amount: number;
  detail: TInvoiceDetail;
  billings: Tbilling[];
  contract: TInvoiceContract;
  k8s_user: string;
  createdTime: Date;
};
const mongodb = new MongoClient(process.env.MONGODB_URI_COSTCENTER!);
const client = mongodb.db();

async function pullInvoiceData() {
  const invoicesCollection = client.collection<InvoicesCollection>('invoices');
  const billings = await invoicesCollection
    .aggregate<Tbilling>([
      { $unwind: '$billings' },
      {
        $replaceRoot: {
          newRoot: '$billings'
        }
      }
    ])
    .toArray();
  const data = billings.map((b) => b.order_id);
  // console.log(data)
  const result = await globalPrisma.$transaction(async (tx) => {
    const existData = await tx.payment.findMany({
      where: {
        id: {
          in: data
        },
        invoiced_at: false
      },
      select: {
        id: true
      }
    });
    console.log(existData);
    return await tx.payment.updateMany({
      where: {
        id: {
          in: existData.map((d) => d.id)
        }
      },
      data: {
        invoiced_at: true
      }
    });
  });
  console.log(result);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (process.env.migrate !== 'true') return;
    console.log('pullInvoice');
    await pullInvoiceData();
    console.log('ok');
    return res.json('ok');
  } catch (error) {
    console.log(error);
    return res.json('error');
  }
}
