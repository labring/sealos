import { afterEach, describe, expect, it, vi } from 'vitest';

const { refreshRepo } = vi.hoisted(() => ({
  refreshRepo: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/services/backend/template-repo', () => ({
  ensureTemplateRepoFresh: refreshRepo
}));

import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';

afterEach(() => {
  refreshRepo.mockClear();
  delete process.env.TEMPLATE_CATEGORIES;
  delete process.env.NEXT_PUBLIC_BRAND_NAME;
  delete process.env.DESKTOP_DOMAIN;
  delete process.env.SEALOS_CLOUD_DOMAIN;
});

describe('client app config readiness', () => {
  it('can validate the local config without refreshing the repository', async () => {
    await expect(getClientAppConfigServer({ refreshRepo: false })).resolves.toMatchObject({
      brandName: 'Sealos'
    });

    expect(refreshRepo).not.toHaveBeenCalled();
  });

  it('refreshes the repository for normal client config reads', async () => {
    await getClientAppConfigServer();

    expect(refreshRepo).toHaveBeenCalledOnce();
  });
});
