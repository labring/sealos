import { globalPrisma } from '@/services/backend/db/init';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getVersion } from '@/services/enable';
import type { ServerResponse } from 'http';
import type { NextApiRequest } from 'next';
import type { PrismaClient } from 'prisma/global/generated/client';
import { generateInviteCode } from './codes';
import { INVITE_COOKIE_MAX_AGE, INVITE_COOKIE_NAME } from './constants';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Registration source + invite attribution: API sets source; web reads invite cookie.
export type RegistrationContext = {
  source: 'WEB' | 'API';
  inviteCode?: string;
};

// Next API routes parse cookies for us, so reuse req.cookies directly.
export const readInviteCodeFromRequest = (req: NextApiRequest): string | undefined => {
  const code = req.cookies?.[INVITE_COOKIE_NAME];
  if (typeof code !== 'string') return undefined;
  const trimmed = code.trim();
  return trimmed ? trimmed : undefined;
};

export const webRegistrationFromRequest = (req: NextApiRequest): RegistrationContext => ({
  source: 'WEB',
  inviteCode: readInviteCodeFromRequest(req)
});

export type SigninInviteIssue = 'not_found' | 'disabled' | 'unavailable' | 'error';

/**
 * Accept the invite before the signin page responds, so the cookie already
 * exists when the user immediately starts OAuth.
 */
export const prepareInviteForSignin = async ({
  req,
  res,
  invite
}: {
  req: Pick<NextApiRequest, 'cookies' | 'headers'>;
  res: Pick<ServerResponse, 'getHeader' | 'setHeader'>;
  invite: string | string[] | undefined;
}): Promise<SigninInviteIssue | null> => {
  // Don't overwrite a previously accepted invite; the plain login page does
  // not query the DB for the activity.
  if (invite === undefined || req.cookies[INVITE_COOKIE_NAME]) return null;
  if (typeof invite !== 'string' || !invite.trim()) return 'not_found';

  try {
    // SSR may be the process's first request, so it cannot rely on AppConfig
    // loaded later by the browser.
    await getCloudConfig();
    if (getVersion() === 'en') return 'unavailable';

    const code = invite.trim();
    const inviteCode = await globalPrisma.registrationInviteCode.findUnique({
      where: { code },
      select: { enabled: true, inviterUid: true }
    });
    if (!inviteCode) return 'not_found';
    if (!inviteCode.enabled) return 'disabled';
    const inviter = await globalPrisma.user.findUnique({
      where: { uid: inviteCode.inviterUid },
      select: { uid: true }
    });
    if (!inviter) return 'not_found';

    const cookie = [
      `${INVITE_COOKIE_NAME}=${encodeURIComponent(code)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${INVITE_COOKIE_MAX_AGE}`,
      ...(req.headers['x-forwarded-proto'] === 'https' ? ['Secure'] : [])
    ].join('; ');
    const existing = res.getHeader('Set-Cookie');
    // The language cookie was set earlier; we must append, not replace it with
    // the invite cookie.
    res.setHeader('Set-Cookie', [
      ...(Array.isArray(existing) ? existing : existing ? [String(existing)] : []),
      cookie
    ]);
    return null;
  } catch (error) {
    console.error('prepareInviteForSignin: failed to receive invitation', error);
    return 'error';
  }
};

/**
 * Persist registration attribution in the same transaction that creates the User:
 * 1. registrationSource (legacy users without this row are treated as WEB);
 * 2. when an invite code is present, validate it server-side (exists, enabled,
 *    inviter exists, defensive inviterUid ≠ new user.uid); if it passes, create
 *    registrationReferral (inviteeUid unique, i.e. idempotent).
 * Invite validation failures only skip the invite silently (logged); they must
 * never block the registration itself.
 */
export const attachRegistrationInTransaction = async (
  tx: TransactionClient,
  userUid: string,
  registration?: RegistrationContext
) => {
  const source = registration?.source ?? 'WEB';
  await tx.registrationSource.create({
    data: { userUid, source }
  });

  const inviteCode = registration?.inviteCode?.trim();
  if (!inviteCode) return;

  try {
    const code = await tx.registrationInviteCode.findUnique({
      where: { code: inviteCode },
      select: { id: true, inviterUid: true, enabled: true }
    });
    // Validate the invite code server-side; never trust a client-supplied inviterUid
    if (!code || !code.enabled) {
      console.warn('attachRegistration: invite code not found or disabled, skip referral', {
        userUid
      });
      return;
    }
    if (code.inviterUid === userUid) {
      // Defensive: the new user has no code of their own yet, so this should never trigger
      console.warn('attachRegistration: self referral detected, skip', { userUid });
      return;
    }
    const inviter = await tx.user.findUnique({
      where: { uid: code.inviterUid },
      select: { uid: true }
    });
    if (!inviter) {
      console.warn('attachRegistration: inviter user missing, skip referral', { userUid });
      return;
    }
    await tx.registrationReferral.create({
      data: {
        inviteeUid: userUid,
        inviterUid: code.inviterUid,
        codeId: code.id
      }
    });
  } catch (error) {
    // Validation failures (missing/disabled/self-referral) return above and
    // never affect registration; this handles DB-level errors from the referral
    // write itself. A failed statement poisons the whole transaction, so the
    // registration fails with it. Trade-off between "attribute in the same
    // transaction" and "never block registration" under infrastructure failure:
    // per spec, atomicity of attribution and account creation wins; no
    // cross-transaction fallback.
    console.error('attachRegistration: failed to attach referral', { userUid, error });
    throw error;
  }
};

// The two generated clients shape errors differently; match unique conflicts by stable error code
export const isUniqueConstraintError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

/**
 * Idempotent get-or-create of the invite code:
 * - return an existing code as-is (never overwrite);
 * - on a concurrent inviterUid unique conflict, re-read;
 * - on a random code collision, retry with a new code.
 */
export const ensureInviteCode = async (userUid: string) => {
  const existing = await globalPrisma.registrationInviteCode.findUnique({
    where: { inviterUid: userUid }
  });
  if (existing) return existing;

  const MAX_RETRY = 5;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      return await globalPrisma.registrationInviteCode.create({
        data: {
          inviterUid: userUid,
          code: generateInviteCode()
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // The conflict may be inviterUid (concurrent duplicate create) or a
        // random code collision: reuse if re-reading inviterUid hits, else
        // retry with a new code
        const again = await globalPrisma.registrationInviteCode.findUnique({
          where: { inviterUid: userUid }
        });
        if (again) return again;
        continue;
      }
      throw error;
    }
  }
  throw new Error(`ensureInviteCode: exhausted retries for user ${userUid}`);
};
