import { UserRole } from '@/types/team';

jest.mock('@/services/backend/db/init', () => ({
  prisma: {
    workspaceInvitations: {
      upsert: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

import { prisma } from '@/services/backend/db/init';
import { addOrUpdateInviteCode, findInviteCode } from '@/services/backend/db/workspaceInviteCode';

const workspaceInvitations = (prisma as any).workspaceInvitations;

describe('workspace invite code storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-23T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores the configured expiry duration', async () => {
    workspaceInvitations.upsert.mockResolvedValue({});

    await addOrUpdateInviteCode({
      code: 'invite-code',
      inviterUid: '11111111-1111-4111-8111-111111111111',
      inviterCrUid: '22222222-2222-4222-8222-222222222222',
      workspaceUid: '33333333-3333-4333-8333-333333333333',
      role: UserRole.Developer,
      expiresInMinutes: 1440
    });

    expect(workspaceInvitations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          expiresAt: new Date('2026-06-24T00:00:00.000Z')
        }),
        update: expect.objectContaining({
          expiresAt: new Date('2026-06-24T00:00:00.000Z')
        })
      })
    );
  });

  it('treats expired invite codes as missing', async () => {
    workspaceInvitations.findUnique.mockResolvedValue({
      role: 'DEVELOPER',
      invitationCode: 'invite-code',
      workspaceUid: '33333333-3333-4333-8333-333333333333',
      createdAt: new Date('2026-06-22T23:00:00.000Z'),
      inviterUid: '11111111-1111-4111-8111-111111111111',
      inviterCrUid: '22222222-2222-4222-8222-222222222222',
      expiresAt: new Date('2026-06-22T23:59:59.000Z')
    });

    await expect(findInviteCode('invite-code')).resolves.toBeNull();
  });
});
