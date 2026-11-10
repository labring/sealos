import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { activateKol, KolActivationError, previewKolActivation, reserveKolAttempt } from './kol';

export const kolHandler =
  (action: 'preview' | 'activate') => async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return jsonRes(res, { code: 405, message: 'Method not allowed' });
    try {
      const payload =
        (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
      if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });
      await reserveKolAttempt(payload.userUid);
      const { code, expectedUserUid, ruleRevision } = req.body ?? {};
      if (typeof code !== 'string' || code.length > 128)
        throw new KolActivationError('invalid_code');
      if (
        action === 'activate' &&
        (typeof expectedUserUid !== 'string' ||
          !Number.isSafeInteger(ruleRevision) ||
          ruleRevision < 1)
      ) {
        throw new KolActivationError('rule_changed');
      }
      const data =
        action === 'preview'
          ? await previewKolActivation(payload.userUid, code)
          : await activateKol(payload.userUid, { code, expectedUserUid, ruleRevision });
      return jsonRes(res, { code: 200, data });
    } catch (error) {
      if (error instanceof KolActivationError)
        return jsonRes(res, { code: error.status, message: error.reason });
      // 激活码是一次性凭据，不能将请求或 Prisma 参数写入日志。
      console.error('KOL activation request failed');
      return jsonRes(res, { code: 500, message: 'activation_failed' });
    }
  };
