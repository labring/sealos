// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/billing/getNamespaceList';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../src/service/backend/region', () => ({
  makeAPIClientByHeader: vi.fn(async () => ({ post }))
}));
beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ data: { data: [['ns-current', 'Current']] } });
});
const invoke = async (activeOnly?: unknown) => {
  const json = vi.fn();
  await handler(
    { body: { startTime: '2026-10-15', endTime: '2026-10-22', activeOnly } } as any,
    { json } as any
  );
  return json.mock.calls[0][0];
};
it('requests only current memberships for resource analysis', async () => {
  expect((await invoke(true)).code).toBe(200);
  expect(post).toHaveBeenCalledWith('/account/v1alpha1/namespaces', {
    startTime: '2026-10-15',
    endTime: '2026-10-22',
    type: 0,
    activeOnly: true
  });
});
it('preserves historical workspaces for existing billing callers', async () => {
  expect((await invoke()).code).toBe(200);
  expect(post).toHaveBeenCalledWith(
    '/account/v1alpha1/namespaces',
    expect.objectContaining({ activeOnly: false })
  );
});
it('rejects an invalid scope before querying the account service', async () => {
  expect((await invoke('false')).code).toBe(400);
  expect(post).not.toHaveBeenCalled();
});
