import { globalPrisma } from '@/services/backend/db/init';
import type { NextApiRequest } from 'next';
import { Prisma, PrismaClient } from 'prisma/global/generated/client';
import { generateInviteCode } from './codes';
import { INVITE_COOKIE_NAME } from './constants';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// 注册来源与邀请归因上下文：API 入口显式传 API；网页入口从 cookie 读邀请码
export type RegistrationContext = {
  source: 'WEB' | 'API';
  inviteCode?: string;
};

// 从请求 cookie 读邀请码。next API 路由自带 cookie 解析，直接复用
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

/**
 * 在创建 User 的同一事务内落注册归因：
 * 1. registrationSource（无该行的历史用户按 WEB 处理）；
 * 2. 有邀请码时服务端校验（存在、enabled、inviter 存在、防御性 inviterUid ≠ 新 user.uid），
 *    通过则创建 registrationReferral（inviteeUid 唯一即幂等）。
 * 邀请校验失败只静默跳过邀请（记日志），绝不能阻断注册本身。
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
    // 服务端校验邀请码，不信任前端传入的 inviterUid
    if (!code || !code.enabled) {
      console.warn('attachRegistration: invite code not found or disabled, skip referral', {
        userUid
      });
      return;
    }
    if (code.inviterUid === userUid) {
      // 防御性检查：注册时新用户尚无自己的码，正常不可能命中
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
    // 校验类失败（码不存在/停用/自邀）走上面的 return，不影响注册；
    // 这里兜的是 referral 写入本身的 DB 级错误——注意同事务内语句失败会毒化整个
    // 事务，注册会随之失败。这是「同事务落归因」与「绝不阻断注册」在基础设施
    // 故障下的取舍：按 spec 优先保证归因与账号创建的原子一致，不做跨事务兜底。
    console.error('attachRegistration: failed to attach referral', { userUid, error });
    throw error;
  }
};

// Prisma 唯一约束冲突（P2002）：registration 与 rewards 共用同一判断
export const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * 幂等 get-or-create 邀请码：
 * - 已有码直接返回（不覆盖）；
 * - 并发下 inviterUid 唯一冲突 → 重读；
 * - 随机 code 撞车 → 换码重试。
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
        // 冲突可能来自 inviterUid（并发重复创建）或随机 code 撞车：
        // 重读 inviterUid 命中则直接复用，否则换一个 code 重试
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
