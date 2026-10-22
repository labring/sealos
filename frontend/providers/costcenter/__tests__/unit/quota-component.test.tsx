import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Quota from '../../src/components/valuation/quota';
import request from '../../src/service/request';
import useBillingStore from '../../src/stores/billing';

vi.mock('../../src/service/request', () => ({
  default: Object.assign(vi.fn(), { post: vi.fn() })
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const clients: QueryClient[] = [];
const mount = (namespace = '') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <Quota namespace={namespace} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  useBillingStore.setState({ regionList: [{ uid: 'local' }] as any, regionIdx: 0 });
  vi.mocked(request).mockResolvedValue({
    data: { quota: [{ type: 'cpu', used: 0.75, limit: 6 }] }
  });
});
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
});

it('waits for the workspace list before querying all-workspace quota', async () => {
  let resolve!: (value: any) => void;
  vi.mocked(request.post).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  mount();
  expect(request).not.toHaveBeenCalled();
  await act(async () =>
    resolve({
      data: [
        ['ns-first', 'First'],
        ['ns-team', 'Team']
      ]
    })
  );
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith('/api/getQuota', {
      method: 'POST',
      data: { namespace: '', namespaces: ['ns-first', 'ns-team'], regionUid: 'local' }
    })
  );
  expect(await screen.findByText('Used: 0.75Core')).toBeTruthy();
  expect(screen.getByText('Total: 6Core')).toBeTruthy();
});

it('keeps a specific selection separate from all-workspace cache', async () => {
  vi.mocked(request.post).mockResolvedValue({
    data: [
      ['ns-first', 'First'],
      ['ns-team', 'Team']
    ]
  });
  const view = mount();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  view.rerender(
    <QueryClientProvider client={clients[0]}>
      <Quota namespace="ns-team" />
    </QueryClientProvider>
  );
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith('/api/getQuota', {
      method: 'POST',
      data: { namespace: 'ns-team', namespaces: undefined, regionUid: 'local' }
    })
  );
});

it('waits for the new region list and does not reuse another region quota', async () => {
  vi.mocked(request.post).mockImplementation(async (_url, body: any) => ({
    data: [[body.regionUid === 'local' ? 'ns-local' : 'ns-remote', 'Workspace']]
  }));
  mount();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  act(() => useBillingStore.setState({ regionList: [{ uid: 'remote' }] as any }));
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith('/api/getQuota', {
      method: 'POST',
      data: { namespace: '', namespaces: ['ns-remote'], regionUid: 'remote' }
    })
  );
  expect(
    vi
      .mocked(request)
      .mock.calls.some(
        ([, config]: any) =>
          config.data.regionUid === 'remote' && config.data.namespaces.includes('ns-local')
      )
  ).toBe(false);
});

it('shows a contextual error if the workspace list fails', async () => {
  vi.mocked(request.post).mockRejectedValue(new Error('unavailable'));
  mount();
  expect((await screen.findByRole('alert')).textContent).toBe('quota_load_failed');
  expect(request).not.toHaveBeenCalled();
});

it('requests active workspaces independently from the billing-history list', async () => {
  vi.mocked(request.post).mockResolvedValue({ data: [['ns-current', 'Current']] });
  mount();
  await waitFor(() =>
    expect(request.post).toHaveBeenCalledWith(
      '/api/billing/getNamespaceList',
      expect.objectContaining({ activeOnly: true, regionUid: 'local' })
    )
  );
});

it('distinguishes successfully empty quota from a failed request', async () => {
  vi.mocked(request.post).mockResolvedValue({ data: [] });
  vi.mocked(request).mockResolvedValue({ data: { quota: [] } });
  mount();
  expect(await screen.findByText('quota_no_data')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
