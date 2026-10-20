import { buildInviteUrl } from '@/services/backend/activity/constants';
import { ensureInviteCode } from '@/services/backend/activity/registration';
import { readEligibilityFacts } from '@/services/backend/activity/rewards';
import { isActivityAvailable } from '@/services/enable';
import { verifyAccessToken, verifyGlobalToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { RegistrationSourceType } from 'prisma/global/generated/client';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Idempotent get-or-create of the user's invite code (regional or global token).
 * The status endpoint never auto-creates a code; it is persisted only when the
 * user explicitly opens the invite center.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }
  try {
    // International deployments and deployments with desktop.activity.enabled=false
    // don't participate in the activity
    if (!isActivityAvailable()) {
      return jsonRes(res, { code: 503, message: 'Activity unavailable' });
    }
    const payload =
      (await verifyAccessToken(req.headers)) || (await verifyGlobalToken(req.headers));
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    // API-registered accounts earn no rewards at all (including as an inviter);
    // keep the same rule as the reward eligibility check. Issuing no code prevents
    // invite links where the page promises both-side rewards that are never paid.
    const facts = await readEligibilityFacts(payload.userUid);
    if (facts.source === RegistrationSourceType.API) {
      return jsonRes(res, { code: 403, message: 'Ineligible for invite activity' });
    }

    const inviteCode = await ensureInviteCode(payload.userUid);
    return jsonRes(res, {
      code: 200,
      data: {
        code: inviteCode.code,
        inviteUrl: buildInviteUrl(inviteCode.code)
      }
    });
  } catch (error) {
    console.error('activity/invite/code error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
