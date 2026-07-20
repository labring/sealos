import { deleteExpiredVerificationCodes } from '../db/verifyCode';
import { deleteExpiredVerificationFlowTickets } from '../db/verificationTicket';
import { deleteExpiredVerificationRateLimits } from '../db/verificationRateLimit';

export async function cleanupExpiredVerificationData() {
  const now = new Date();
  await Promise.all([
    deleteExpiredVerificationCodes(now),
    deleteExpiredVerificationFlowTickets(now),
    deleteExpiredVerificationRateLimits(now)
  ]);
}
