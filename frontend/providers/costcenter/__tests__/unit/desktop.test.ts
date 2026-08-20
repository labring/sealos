import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceViaDesktop, DesktopRequestError } from '@/service/backend/desktop';

describe('createWorkspaceViaDesktop', () => {
  it('creates a workspace through the configured Desktop endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        code: 200,
        message: 'Successfully',
        data: { namespace: { id: 'ns-created' } }
      })
    );

    await expect(
      createWorkspaceViaDesktop({
        origin: 'http://desktop-frontend.sealos.svc.cluster.local:3000',
        internalToken: 'test-token',
        teamName: 'test-team',
        userType: 'payg',
        fetchImpl
      })
    ).resolves.toBe('ns-created');

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      'http://desktop-frontend.sealos.svc.cluster.local:3000/api/auth/namespace/create'
    );
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'test-token'
      },
      body: JSON.stringify({ teamName: 'test-team', userType: 'payg' })
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('preserves a Desktop client error', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ code: 409, message: 'The team is already exist', data: null })
      );

    await expect(
      createWorkspaceViaDesktop({
        origin: 'https://cloud.example.com',
        internalToken: 'test-token',
        teamName: 'existing-team',
        userType: 'subscription',
        fetchImpl
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<DesktopRequestError>>({
        code: 409,
        message: 'The team is already exist'
      })
    );
  });

  it('maps an invalid JSON response to a gateway error', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<html>gateway error</html>', { status: 200 }));

    await expect(
      createWorkspaceViaDesktop({
        origin: 'https://cloud.example.com',
        internalToken: 'test-token',
        teamName: 'test-team',
        userType: 'payg',
        fetchImpl
      })
    ).rejects.toMatchObject({ code: 502, message: 'Desktop returned an invalid response' });
  });

  it('rejects a successful response without a workspace ID', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ code: 200, message: 'Successfully', data: null }));

    await expect(
      createWorkspaceViaDesktop({
        origin: 'https://cloud.example.com',
        internalToken: 'test-token',
        teamName: 'test-team',
        userType: 'payg',
        fetchImpl
      })
    ).rejects.toMatchObject({ code: 502, message: 'Desktop returned an invalid response' });
  });

  it('reports a timeout distinctly', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

    await expect(
      createWorkspaceViaDesktop({
        origin: 'https://cloud.example.com',
        internalToken: 'test-token',
        teamName: 'test-team',
        userType: 'payg',
        fetchImpl
      })
    ).rejects.toMatchObject({ code: 504, message: 'Desktop request timed out' });
  });
});
