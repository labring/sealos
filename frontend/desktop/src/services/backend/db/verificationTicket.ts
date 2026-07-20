import { globalPrisma } from './init';
import { withSerializableTransaction } from './transaction';

const FLOW_TICKET_TTL_MS = 5 * 60_000;

export async function createVerificationFlowTicket({
  uid,
  userUid,
  providerType,
  oldProviderId,
  scenario
}: {
  uid: string;
  userUid: string;
  providerType: string;
  oldProviderId: string;
  scenario: string;
}) {
  return withSerializableTransaction(async (tx) => {
    await tx.verificationFlowTicket.deleteMany({
      where: { userUid, providerType, scenario }
    });
    return tx.verificationFlowTicket.create({
      data: {
        uid,
        userUid,
        providerType,
        oldProviderId,
        scenario,
        expiresAt: new Date(Date.now() + FLOW_TICKET_TTL_MS)
      }
    });
  });
}

export async function getVerificationFlowTicket({
  uid,
  userUid,
  providerType,
  scenario
}: {
  uid: string;
  userUid: string;
  providerType: string;
  scenario: string;
}) {
  return globalPrisma.verificationFlowTicket.findFirst({
    where: {
      uid,
      userUid,
      providerType,
      scenario,
      expiresAt: { gt: new Date() }
    }
  });
}

export async function consumeVerificationFlowTicket({
  uid,
  userUid,
  providerType,
  scenario
}: {
  uid: string;
  userUid: string;
  providerType: string;
  scenario: string;
}) {
  const result = await globalPrisma.verificationFlowTicket.deleteMany({
    where: {
      uid,
      userUid,
      providerType,
      scenario,
      expiresAt: { gt: new Date() }
    }
  });
  return result.count === 1;
}

export async function deleteExpiredVerificationFlowTickets(now = new Date()) {
  return globalPrisma.verificationFlowTicket.deleteMany({ where: { expiresAt: { lte: now } } });
}
