import { freeClusterForm } from '@/constant/product';
import { authSession } from '@/services/backend/auth';
import {
  findClusterByUIDAndClusterID,
  isKubeSystemIDBound,
  updateClusterIdAndIssueLicense
} from '@/services/backend/db/cluster';
import { ExpiredTime, generateLicenseToken, hasIssuedLicense } from '@/services/backend/db/license';
import { getPaymentByID } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { LicenseRecordPayload } from '@/types';
import { calculatePrice } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

export type ActiveClusterParams = {
  clusterId: string;
  kubeSystemID: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const { kubeSystemID, clusterId } = req.body as ActiveClusterParams;

    if (!clusterId || !kubeSystemID) {
      return jsonRes(res, { code: 400, message: 'Request parameter error' });
    }

    const isBound = await isKubeSystemIDBound(kubeSystemID);
    if (isBound) {
      return jsonRes(res, {
        code: 400,
        message: 'ID is already bound to another cluster'
      });
    }

    const existingCluster = await findClusterByUIDAndClusterID({
      uid: userInfo.uid,
      clusterId: clusterId
    });

    if (existingCluster?.kubeSystemID) {
      return jsonRes(res, {
        code: 400,
        message: 'The cluster has been established'
      });
    }

    const handleScaledStandard = async () => {
      if (!existingCluster?.orderID) return;
      const payment = await getPaymentByID({
        uid: userInfo.uid,
        orderID: existingCluster.orderID
      });
      if (!payment) {
        return { message: 'No order found' };
      }
      const issuedLicense = await hasIssuedLicense({
        uid: userInfo.uid,
        orderID: existingCluster.orderID
      });
      if (issuedLicense) {
        return { message: 'orderID cannot be reused' };
      }

      const expiredTime = parseInt(existingCluster.months || freeClusterForm.months) * ExpiredTime;
      const _token = generateLicenseToken(
        {
          type: 'Cluster',
          clusterID: kubeSystemID,
          data: {
            nodeCount: 99,
            totalCPU: existingCluster.cpu || freeClusterForm.cpu,
            totalMemory: existingCluster.memory || freeClusterForm.memory
          }
        },
        expiredTime
      );

      const record: LicenseRecordPayload = {
        uid: userInfo.uid,
        amount: payment.amount,
        token: _token,
        orderID: existingCluster.orderID,
        quota: payment.amount,
        payMethod: payment.payMethod,
        type: 'Cluster',
        clusterId: clusterId,
        cpu: existingCluster.cpu,
        memory: existingCluster.memory,
        months: existingCluster.months,
        expiredTime
      };

      const result = await updateClusterIdAndIssueLicense({
        uid: userInfo.uid,
        clusterId: clusterId,
        kubeSystemID: kubeSystemID,
        licensePayload: record
      });

      return result;
    };

    const handleStandard = async () => {
      const expiredTime = parseInt(freeClusterForm.months) * ExpiredTime;

      const _token = generateLicenseToken(
        {
          type: 'Cluster',
          clusterID: kubeSystemID,
          data: {
            nodeCount: 99,
            totalCPU: freeClusterForm.cpu,
            totalMemory: freeClusterForm.memory
          }
        },
        expiredTime
      );

      const record: LicenseRecordPayload = {
        uid: userInfo.uid,
        amount: 0,
        token: _token,
        orderID: '',
        quota: 0,
        payMethod: 'stripe',
        type: 'Cluster',
        clusterId: clusterId,
        cpu: freeClusterForm.cpu,
        memory: freeClusterForm.memory,
        months: freeClusterForm.months,
        expiredTime
      };

      const result = await updateClusterIdAndIssueLicense({
        uid: userInfo.uid,
        clusterId: clusterId,
        kubeSystemID: kubeSystemID,
        licensePayload: record
      });

      return result;
    };

    let activeResult;
    if (existingCluster?.orderID) {
      activeResult = await handleScaledStandard();
    } else {
      activeResult = await handleStandard();
    }

    return jsonRes(res, {
      data: activeResult
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
