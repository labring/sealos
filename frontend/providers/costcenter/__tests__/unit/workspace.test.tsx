import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NamespaceMenu from '../../src/components/menu/NamespaceMenu';
import NamespaceIdMenu from '../../src/components/menu/NamespaceIdMenu';
import request from '../../src/service/request';
import useBillingStore from '../../src/stores/billing';
import { AppBillingTable } from '../../src/components/table/AppBillingTable';
import { AppOverviewTable } from '../../src/components/table/AppOverviewTable';

vi.mock('../../src/service/request', () => ({ default: { post: vi.fn() } }));

vi.mock('next-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});
vi.mock('../../src/components/table/billingDetails', () => ({ default: () => null }));
vi.mock('../../src/components/table/AppBillingDetails', () => ({ default: () => null }));

beforeEach(() => {
  useBillingStore.setState({ namespaceList: [['', 'All Workspace']], namespaceIdx: 0 });
});
afterEach(cleanup);

const billing = [
  {
    namespace: 'ns-first',
    app_name: 'app',
    app_type: 0,
    time: '2026-09-22T10:00:00Z',
    amount: 0,
    order_id: 'order'
  }
];
const overview = [{ namespace: 'ns-first', appName: 'app', appType: 0, amount: 0 }];

for (const [name, element] of [
  ['billing', <AppBillingTable data={billing as any} />],
  ['overview', <AppOverviewTable data={overview as any} />]
] as const) {
  describe(`${name} workspace labels`, () => {
    it('updates existing rows after namespace names load and are renamed', () => {
      render(<ChakraProvider>{element}</ChakraProvider>);
      act(() =>
        useBillingStore.getState().setNamespaceList([
          ['', 'All Workspace'],
          ['ns-first', 'First workspace']
        ])
      );
      expect(screen.queryByText('First workspace')).not.toBeNull();
      act(() =>
        useBillingStore.getState().setNamespaceList([
          ['', 'All Workspace'],
          ['ns-first', 'Renamed workspace']
        ])
      );
      expect(screen.getByText('Renamed workspace')).toBeTruthy();
      expect(screen.getByRole('columnheader', { name: 'workspace_id' })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'ns-first' })).toBeTruthy();
      expect(screen.queryByText('First workspace')).toBeNull();
    });
  });
}

describe('workspace ID search', () => {
  it('searches IDs, selects the original namespace, syncs names, and clears the filter', async () => {
    vi.mocked(request.post).mockResolvedValue({
      data: [
        ['ns-first', 'Same name'],
        ['ns-second', 'Same name'],
        ['ns-third', 'Third workspace']
      ]
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <ChakraProvider>
          <NamespaceMenu isDisabled={false} />
          <NamespaceIdMenu isDisabled={false} />
        </ChakraProvider>
      </QueryClientProvider>
    );
    const allIds = screen.getByRole('button', { name: 'all_workspace_ids' });
    await waitFor(() => expect((allIds as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(allIds);
    const input = await screen.findByRole('textbox', { name: 'search_workspace_id' });
    fireEvent.change(input, { target: { value: ' SECOND ' } });
    expect(screen.queryByRole('button', { name: 'ns-first' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ns-second' }));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'search_workspace_id' })).toBeNull()
    );
    expect(useBillingStore.getState().getNamespace()).toEqual(['ns-second', 'Same name']);
    expect(screen.getByRole('button', { name: 'Same name' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ns-second' }));
    expect(
      ((await screen.findByRole('textbox', { name: 'search_workspace_id' })) as HTMLInputElement)
        .value
    ).toBe('');
    fireEvent.change(screen.getByRole('textbox', { name: 'search_workspace_id' }), {
      target: { value: 'missing' }
    });
    expect(screen.getByRole('status').textContent).toBe('No Data Available');
    fireEvent.click(screen.getByRole('button', { name: 'all_workspace_ids' }));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'search_workspace_id' })).toBeNull()
    );
    expect(useBillingStore.getState().getNamespace()?.[0]).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'all_workspace' }));
    const nameInput = await screen.findByRole('textbox', { name: 'search_workspace_name' });
    fireEvent.change(nameInput, { target: { value: ' THIRD ' } });
    expect(screen.queryByRole('button', { name: 'Same name' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Third workspace' }));
    expect(screen.getByRole('button', { name: 'ns-third' })).toBeTruthy();
    expect(useBillingStore.getState().getNamespace()?.[0]).toBe('ns-third');
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'search_workspace_name' })).toBeNull()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Third workspace' }));
    const reopenedNameInput = await screen.findByRole('textbox', { name: 'search_workspace_name' });
    expect((reopenedNameInput as HTMLInputElement).value).toBe('');
    fireEvent.change(reopenedNameInput, { target: { value: 'same' } });
    const sameNames = screen.getAllByRole('button', { name: 'Same name' });
    expect(sameNames).toHaveLength(2);
    fireEvent.click(sameNames[1]);
    expect(useBillingStore.getState().getNamespace()?.[0]).toBe('ns-second');
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'search_workspace_name' })).toBeNull()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Same name' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'search_workspace_name' }), {
      target: { value: 'missing' }
    });
    expect(screen.getByRole('status').textContent).toBe('No Data Available');
    fireEvent.click(screen.getByRole('button', { name: 'all_workspace' }));
    expect(useBillingStore.getState().getNamespace()?.[0]).toBe('');
    client.clear();
  });
});
