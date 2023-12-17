import { authSession } from '@/services/backend/auth';
import {
  findClusterByUIDAndClusterID,
  isKubeSystemIDBound,
  updateCluster,
  updateClusterIdAndIssueLicense
} from '@/services/backend/db/cluster';
import { generateLicenseToken, hasIssuedLicense } from '@/services/backend/db/license';
import { getPaymentByID } from '@/services/backend/db/payment';
import { jsonRes } from '@/services/backend/response';
import { LicenseRecordPayload } from '@/types';
import { result } from 'lodash';
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
        message: 'clusterID is already bound to another cluster'
      });
    }

    const existingCluster = await findClusterByUIDAndClusterID({
      uid: userInfo.uid,
      clusterId: clusterId
    });

    console.log(existingCluster, 'existingCluster');

    if (existingCluster?.kubeSystemID) {
      return jsonRes(res, {
        code: 400,
        message: 'The cluster has been established'
      });
    }

    const handleEnterpriseAndLicense = async () => {
      if (!existingCluster?.orderID) return;
      const payment = await getPaymentByID({
        uid: userInfo.uid,
        orderID: existingCluster.orderID
      });
      if (!payment) {
        return jsonRes(res, { code: 400, message: 'No order found' });
      }

      const issuedLicense = await hasIssuedLicense({
        uid: userInfo.uid,
        orderID: existingCluster.orderID
      });
      if (issuedLicense) {
        return jsonRes(res, { code: 400, message: 'orderID cannot be reused' });
      }

      const _token = generateLicenseToken({
        type: 'Account',
        clusterID: kubeSystemID,
        data: { amount: payment.amount }
      });

      const record: LicenseRecordPayload = {
        uid: userInfo.uid,
        amount: payment.amount,
        token: _token,
        orderID: existingCluster.orderID,
        quota: payment.amount,
        payMethod: payment.payMethod,
        type: 'Account',
        clusterId: clusterId
      };

      const result = await updateClusterIdAndIssueLicense({
        uid: userInfo.uid,
        clusterId: clusterId,
        kubeSystemID: kubeSystemID,
        licensePayload: record
      });

      return result;
    };

    const handleStandardAndLicense = async () => {
      const _token = generateLicenseToken({
        type: 'Account',
        clusterID: kubeSystemID,
        data: { amount: 299 }
      });
      const record: LicenseRecordPayload = {
        uid: userInfo.uid,
        amount: 299,
        token: _token,
        orderID: '',
        quota: 299,
        payMethod: 'stripe',
        type: 'Account',
        clusterId: clusterId
      };
      const result = await updateClusterIdAndIssueLicense({
        uid: userInfo.uid,
        clusterId: clusterId,
        kubeSystemID: kubeSystemID,
        licensePayload: record
      });
      return result;
    };

    const handleActive = async () => {
      return await updateCluster({
        uid: userInfo.uid,
        clusterId: clusterId,
        updates: {
          kubeSystemID: kubeSystemID,
          kubeSystemUpdateAt: new Date()
        }
      });
    };

    let activeResult;
    if (existingCluster?.orderID === null && existingCluster?.licenseID === null) {
      activeResult = await handleActive();
    } else if (existingCluster?.orderID === null && !existingCluster?.licenseID) {
      activeResult = await handleStandardAndLicense();
    } else if (existingCluster?.orderID !== null && !existingCluster?.licenseID) {
      activeResult = await handleEnterpriseAndLicense();
    } else {
      activeResult = await handleActive();
      console.log('其他情况');
    }

    return jsonRes(res, {
      data: activeResult
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
