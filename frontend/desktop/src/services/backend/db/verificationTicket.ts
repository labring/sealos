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

const indexInitializations = new WeakMap<object, Promise<void>>();

async function connectToCollection() {
  const client = await connectToDatabase();
  const collection = client.db().collection<VerificationFlowTicket>('verification_flow_tickets');
  let initialization = indexInitializations.get(client);
  if (!initialization) {
    initialization = Promise.all([
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      collection.createIndex({ userUid: 1, providerType: 1, scenario: 1 }, { unique: true }),
      collection.createIndex({ uid: 1 }, { unique: true })
    ])
      .then(() => undefined)
      .catch((error) => {
        indexInitializations.delete(client);
        throw error;
      });
    indexInitializations.set(client, initialization);
  }
  await initialization;
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
