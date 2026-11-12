import { globalPrisma } from '@/services/backend/db/init';
import { Prisma } from 'prisma/global/generated/client';

type Candidate = { id: string; inviteeUid: string; rewardCheckedAt: Date };

/** Both compensation entry points share one durable, bounded rotation. */
export const takeMissingReferralRewards = async (inviterUid?: string) => {
  const candidates = await globalPrisma.$queryRaw<Candidate[]>(Prisma.sql`
    SELECT r."id", r."inviteeUid", r."rewardCheckedAt"
    FROM "RegistrationReferral" r
    JOIN "ActivityRewardGrant" owner ON owner."businessKey" = 'DESKTOP_FIRST_LOGIN:' || r."inviteeUid"::TEXT
    WHERE r."status" != 'INELIGIBLE' AND owner."identityKey" LIKE 'v1:%'
      AND owner."recipientUid" = r."inviteeUid" AND owner."type" = 'DESKTOP_FIRST_LOGIN'
      ${inviterUid ? Prisma.sql`AND r."inviterUid" = ${inviterUid}::UUID` : Prisma.empty}
      AND NOT EXISTS (SELECT 1 FROM "RegistrationSource" s
        WHERE s."userUid" = r."inviteeUid" AND s."source" = 'API')
      AND (
        (r."inviterRewardAmount" > 0
          AND EXISTS (SELECT 1 FROM "User" u WHERE u."uid" = r."inviterUid" AND u."status" = 'NORMAL_USER')
          AND NOT EXISTS (SELECT 1 FROM "RegistrationSource" s WHERE s."userUid" = r."inviterUid" AND s."source" = 'API')
          AND NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITER'))
        OR (r."inviteeRewardAmount" > 0
          AND NOT EXISTS (SELECT 1 FROM "ActivityRewardGrant" g WHERE g."referralId" = r."id" AND g."type" = 'REFERRAL_INVITEE'))
      )
    ORDER BY r."rewardCheckedAt" ASC, r."id" ASC LIMIT 20
  `);
  const claimed: Candidate[] = [];
  for (const candidate of candidates) {
    for (let attempt = 0; ; attempt++) {
      try {
        // 付款前推进轮转；即使创建奖励记录失败或进程退出，也不能反复占满同一批次。
        // CAS 避免多个副本同时领取；时间至少前进 1ms，兼容数据库毫秒精度。
        const updated = await globalPrisma.registrationReferral.updateMany({
          where: { id: candidate.id, rewardCheckedAt: candidate.rewardCheckedAt },
          data: {
            rewardCheckedAt: new Date(Math.max(Date.now(), candidate.rewardCheckedAt.getTime() + 1))
          }
        });
        if (updated.count === 1) claimed.push(candidate);
        break;
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        if (code === 'P2034' && attempt < 2) continue;
        console.error('Activity referral scan claim failed', { referralId: candidate.id, code });
        break;
      }
    }
  }
  return claimed;
};
