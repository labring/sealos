import { freeClusterForm } from '@/constant/product';
import { authSession } from '@/services/backend/auth';
import { findClusterByUIDAndClusterID } from '@/services/backend/db/cluster';
import {
  ExpiredTime,
  createLicenseRecord,
  generateLicenseToken,
  hasIssuedLicense
} from '@/services/backend/db/license';
import { getPaymentByID } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { CreateLicenseParams, LicenseRecordPayload, PaymentStatus } from '@/types';
import { calculatePrice } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { orderID, clusterId, cpu, memory, months } = req.body as CreateLicenseParams;
    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }

    if (!clusterId || !cpu || !memory || !months) {
      return jsonRes(res, { code: 400, message: 'Request parameter error' });
    }

    const cluster = await findClusterByUIDAndClusterID({
      uid: userInfo.uid,
      clusterId: clusterId
    });
    if (!cluster?.kubeSystemID) {
      return jsonRes(res, {
        code: 400,
        message: 'The cluster is not activated and cannot be purchased'
      });
    }

    const expiredTime = parseInt(months) * ExpiredTime;

    if (!orderID) {
      const freeToken = generateLicenseToken(
        {
          type: 'Cluster',
          clusterID: cluster.kubeSystemID,
          data: {
            totalCPU: freeClusterForm.cpu,
            totalMemory: freeClusterForm.memory,
            nodeCount: 99
          }
        },
        expiredTime
      );
      const freeRecord: LicenseRecordPayload = {
        uid: userInfo.uid,
        amount: 0,
        token: freeToken,
        orderID: '',
        quota: 0,
        payMethod: 'stripe',
        type: 'Cluster',
        clusterId,
        cpu: freeClusterForm.cpu,
        memory: freeClusterForm.memory,
        months: freeClusterForm.months,
        expiredTime
      };
      const freeResult = await createLicenseRecord(freeRecord);
      return jsonRes(res, { data: freeResult });
    }

    const payment = await getPaymentByID({ uid: userInfo.uid, orderID: orderID });
    if (!payment) {
      return jsonRes(res, { code: 400, message: 'No order found' });
    }
    const price = calculatePrice({ cpu, months, memory }, freeClusterForm);

    if (payment.amount !== price) {
      return jsonRes(res, { code: 400, message: 'mismatch between order and cluster size' });
    }

    const issuedLicense = await hasIssuedLicense({ uid: userInfo.uid, orderID: orderID });
    if (issuedLicense) {
      return jsonRes(res, { code: 400, message: 'orderID cannot be reused' });
    }

    const _token = generateLicenseToken(
      {
        type: 'Cluster',
        clusterID: cluster.kubeSystemID,
        data: { totalCPU: cpu, totalMemory: memory, nodeCount: 99 }
      },
      expiredTime
    );

    const record: LicenseRecordPayload = {
      uid: userInfo.uid,
      amount: payment.amount,
      token: _token,
      orderID: orderID,
      quota: payment.amount,
      payMethod: payment.payMethod,
      type: 'Cluster',
      clusterId: clusterId,
      cpu: cpu,
      memory: memory,
      months: months,
      expiredTime
    };

    if (payment.status !== PaymentStatus.PaymentSuccess) {
      return jsonRes(res, {
        code: 400,
        message: 'Unpaid'
      });
    }

    const result = await createLicenseRecord(record);
    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
