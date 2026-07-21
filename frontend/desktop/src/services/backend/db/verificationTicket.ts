import { connectToDatabase } from './mongodb';

const FLOW_TICKET_TTL_MS = 5 * 60_000;

type VerificationFlowTicket = {
  uid: string;
  userUid: string;
  providerType: string;
  oldProviderId: string;
  scenario: string;
  expiresAt: Date;
};

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<VerificationFlowTicket>('verification_flow_tickets');
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await collection.createIndex({ userUid: 1, providerType: 1, scenario: 1 }, { unique: true });
  await collection.createIndex({ uid: 1 }, { unique: true });
  return collection;
}

export async function createVerificationFlowTicket({
  uid,
  userUid,
  providerType,
  oldProviderId,
  scenario
}: Omit<VerificationFlowTicket, 'expiresAt'>) {
  const tickets = await connectToCollection();
  return tickets.findOneAndUpdate(
    { userUid, providerType, scenario },
    {
      $set: {
        uid,
        userUid,
        providerType,
        oldProviderId,
        scenario,
        expiresAt: new Date(Date.now() + FLOW_TICKET_TTL_MS)
      }
    },
    { upsert: true, returnDocument: 'after' }
  );
}

type TicketSelector = Pick<VerificationFlowTicket, 'uid' | 'userUid' | 'providerType' | 'scenario'>;

export async function getVerificationFlowTicket(selector: TicketSelector) {
  const tickets = await connectToCollection();
  return tickets.findOne({ ...selector, expiresAt: { $gt: new Date() } });
}

export async function consumeVerificationFlowTicket(selector: TicketSelector) {
  const tickets = await connectToCollection();
  const result = await tickets.findOneAndDelete({
    ...selector,
    expiresAt: { $gt: new Date() }
  });
  return !!result.value;
}
