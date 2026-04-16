import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceGrantStatus } from 'prisma/global/generated/client';

vi.mock('@/services/backend/db/init', () => ({
  globalPrisma: {
    oAuthDeviceGrant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    oAuthUserConsent: {
      findFirst: vi.fn(),
      upsert: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

vi.mock('@/services/enable', () => ({
  enableOAuth2Idp: vi.fn(() => true)
}));

import { getAuthorizeContext, submitAuthorizeDecision } from '@/services/backend/oauth2/service';
import { globalPrisma } from '@/services/backend/db/init';

const mockPrisma = globalPrisma as any;

const buildGrantWithClient = (status: DeviceGrantStatus) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  clientId: 'client-1',
  deviceCodeHash: 'device-hash',
  userCodeHash: 'user-code-hash',
  userUid: null,
  status,
  expiresAt: new Date(Date.now() + 60 * 1000),
  lastPollAt: null,
  pollCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  client: {
    id: 'client-db-id',
    clientId: 'client-1',
    name: 'Test Client',
    logoUrl: null
  }
});

const buildGrant = (status: DeviceGrantStatus) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  clientId: 'client-1',
  deviceCodeHash: 'device-hash',
  userCodeHash: 'user-code-hash',
  userUid: null,
  status,
  expiresAt: new Date(Date.now() + 60 * 1000),
  lastPollAt: null,
  pollCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('oauth2 authorize service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAuthorizeContext returns invalid_grant for unknown request', async () => {
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(null);

    await expect(
      getAuthorizeContext({
        request_id: '550e8400-e29b-41d4-a716-446655440000'
      })
    ).rejects.toMatchObject({
      error: 'invalid_grant'
    });
  });

  it('getAuthorizeContext returns expired_token for expired grant', async () => {
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue({
      ...buildGrantWithClient(DeviceGrantStatus.PENDING),
      expiresAt: new Date(Date.now() - 1000)
    });

    await expect(
      getAuthorizeContext({
        request_id: '550e8400-e29b-41d4-a716-446655440000'
      })
    ).rejects.toMatchObject({
      error: 'expired_token'
    });
  });

  it('getAuthorizeContext marks has_existing_consent in authenticated context', async () => {
    mockPrisma.oAuthDeviceGrant.findFirst.mockResolvedValue(
      buildGrantWithClient(DeviceGrantStatus.PENDING)
    );
    mockPrisma.oAuthUserConsent.findFirst.mockResolvedValue({
      id: 'consent-id'
    });

    const result = await getAuthorizeContext(
      {
        request_id: '550e8400-e29b-41d4-a716-446655440000'
      },
      'user-uid'
    );

    expect(result.request_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.client_id).toBe('client-1');
    expect(result.has_existing_consent).toBe(true);
  });

  it('submitAuthorizeDecision returns invalid_grant when request is not found', async () => {
    mockPrisma.oAuthDeviceGrant.findUnique.mockResolvedValue(null);

    await expect(
      submitAuthorizeDecision({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        decision: 'approve',
        userUid: 'user-uid'
      })
    ).rejects.toMatchObject({
      error: 'invalid_grant'
    });
  });

  it('submitAuthorizeDecision returns invalid_grant when grant is not pending', async () => {
    mockPrisma.oAuthDeviceGrant.findUnique.mockResolvedValue(
      buildGrant(DeviceGrantStatus.APPROVED)
    );

    await expect(
      submitAuthorizeDecision({
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        decision: 'approve',
        userUid: 'user-uid'
      })
    ).rejects.toMatchObject({
      error: 'invalid_grant'
    });
  });

  it('submitAuthorizeDecision approve uses transaction and updates consent + grant', async () => {
    mockPrisma.oAuthDeviceGrant.findUnique.mockResolvedValue(buildGrant(DeviceGrantStatus.PENDING));
    mockPrisma.oAuthUserConsent.upsert.mockReturnValue('consent-op');
    mockPrisma.oAuthDeviceGrant.update.mockReturnValue('grant-op');
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await submitAuthorizeDecision({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'approve',
      userUid: 'user-uid'
    });

    expect(mockPrisma.oAuthUserConsent.upsert).toHaveBeenCalledWith({
      where: {
        userUid_clientId: {
          userUid: 'user-uid',
          clientId: 'client-1'
        }
      },
      update: {},
      create: {
        userUid: 'user-uid',
        clientId: 'client-1'
      }
    });
    expect(mockPrisma.oAuthDeviceGrant.update).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      data: {
        status: DeviceGrantStatus.APPROVED,
        userUid: 'user-uid'
      }
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(['consent-op', 'grant-op']);
    expect(result).toEqual({ status: 'approved' });
  });

  it('submitAuthorizeDecision deny updates grant status to DENIED', async () => {
    mockPrisma.oAuthDeviceGrant.findUnique.mockResolvedValue(buildGrant(DeviceGrantStatus.PENDING));
    mockPrisma.oAuthDeviceGrant.update.mockResolvedValue({});

    const result = await submitAuthorizeDecision({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'deny',
      userUid: 'user-uid'
    });

    expect(mockPrisma.oAuthDeviceGrant.update).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      data: {
        status: DeviceGrantStatus.DENIED,
        userUid: 'user-uid'
      }
    });
    expect(result).toEqual({ status: 'denied' });
  });
});
