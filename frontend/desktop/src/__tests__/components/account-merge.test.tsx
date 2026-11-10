import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NeedToMerge from '@/components/account/AccountCenter/mergeUser/NeedToMergeModal';
import { PhoneBindingModal } from '@/components/account/AccountCenter/PhoneBindingModal';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { ProviderType } from 'prisma/global/generated/client';

const common = {
  en: await fetch('/locales/en/common.json').then((r) => r.json()),
  zh: await fetch('/locales/zh/common.json').then((r) => r.json())
};
const errors = {
  en: await fetch('/locales/en/error.json').then((r) => r.json()),
  zh: await fetch('/locales/zh/error.json').then((r) => r.json())
};
const mocks = vi.hoisted(() => ({
  config: { commonConfig: undefined as { accountMergeEnabled?: boolean } | undefined },
  merge: vi.fn(),
  verify: vi.fn(),
  sendCode: vi.fn(),
  language: 'en' as 'en' | 'zh'
}));
vi.hoisted(() => {
  Object.assign(globalThis, { process: { env: { NODE_ENV: 'test' } } });
});
vi.mock('@/stores/config', () => ({
  useConfigStore: (selector: (state: typeof mocks.config) => unknown) => selector(mocks.config)
}));
vi.mock('@/api/auth', () => ({
  mergeUserRequest: mocks.merge,
  verifySmsBindRequest: () => mocks.verify,
  getSmsBindCodeRequest: () => mocks.sendCode
}));
vi.mock('prisma/global/generated/client', () => ({ ProviderType: { PHONE: 'PHONE' } }));
vi.mock('@sealos/ui', () => ({ WarnTriangeIcon: () => <span aria-hidden="true" /> }));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string; defaultValue?: string }) => {
      const [prefix, name] = key.includes(':') ? key.split(':') : [options?.ns || 'common', key];
      const resource = prefix === 'error' ? errors : common;
      return resource[mocks.language][name] ?? options?.defaultValue ?? key;
    }
  })
}));

let client: QueryClient;
const onClose = vi.fn();
const mergeData = { code: 'merge-ticket', providerType: ProviderType.PHONE };
const wrap = (children: React.ReactNode) => (
  <ChakraProvider>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </ChakraProvider>
);
const renderAccount = () => render(wrap(<NeedToMerge />));
const renderPhone = () => render(wrap(<PhoneBindingModal isOpen onClose={onClose} />));

async function bindPhone() {
  fireEvent.change(screen.getByRole('textbox', { name: /Phone|手机号/ }), {
    target: { value: '13800138000' }
  });
  // The verification code input is associated with the same translated label in both locales.
  const inputs = screen.getAllByRole('textbox');
  fireEvent.change(inputs[1], { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: common[mocks.language].complete_binding }));
  await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce());
  await screen.findByText(common[mocks.language].merge_account_title);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.language = 'en';
  mocks.config.commonConfig = { accountMergeEnabled: true };
  mocks.merge.mockResolvedValue({ code: 200, message: 'RESULT_SUCCESS' });
  mocks.verify.mockResolvedValue({
    code: 203,
    message: 'USER_MERGE',
    data: { code: 'merge-ticket' }
  });
  mocks.sendCode.mockResolvedValue({ code: 200, data: { challengeId: 'challenge' } });
  client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } }
  });
  vi.spyOn(client, 'invalidateQueries');
  useCallbackStore.setState({
    mergeUserStatus: MergeUserStatus.CANMERGE,
    mergeUserData: mergeData
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  useCallbackStore.setState({ mergeUserStatus: MergeUserStatus.IDLE, mergeUserData: undefined });
});

describe('account binding merge dialog', () => {
  it.each([undefined, {}, { accountMergeEnabled: false }])(
    'hides merging and does not submit with config %j',
    async (config) => {
      mocks.config.commonConfig = config;
      renderAccount();
      await screen.findByText(common.en.account_already_bound);
      expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: common.en.confirm }));
      expect(mocks.merge).not.toHaveBeenCalled();
      expect(useCallbackStore.getState().mergeUserData).toBeUndefined();
      expect(useCallbackStore.getState().mergeUserStatus).toBe(MergeUserStatus.IDLE);
    }
  );

  it.each(['en', 'zh'] as const)(
    'confirms a merge in %s and refreshes user data',
    async (language) => {
      mocks.language = language;
      renderAccount();
      await screen.findByRole('alertdialog');
      expect(screen.getByText(common[language].merge_account_tips2)).toBeTruthy();
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: common[language].cancel })
        )
      );
      fireEvent.click(screen.getByRole('button', { name: common[language].merge }));
      await waitFor(() => expect(mocks.merge).toHaveBeenCalledWith(mergeData));
      await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledOnce());
      expect(useCallbackStore.getState().mergeUserStatus).toBe(MergeUserStatus.IDLE);
    }
  );

  it.each([MergeUserStatus.CONFLICT, MergeUserStatus.CANMERGE])(
    'rejects a conflict or missing ticket for status %s',
    async (status) => {
      useCallbackStore.setState({ mergeUserStatus: status, mergeUserData: undefined });
      renderAccount();
      await screen.findByRole('dialog');
      expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
      expect(mocks.merge).not.toHaveBeenCalled();
    }
  );

  it('cancels without submitting and discards the stored ticket', async () => {
    renderAccount();
    fireEvent.click(await screen.findByRole('button', { name: common.en.cancel }));
    expect(mocks.merge).not.toHaveBeenCalled();
    expect(useCallbackStore.getState().mergeUserData).toBeUndefined();
  });

  it('submits once and blocks dismissal while the merge is pending', async () => {
    mocks.merge.mockReturnValue(new Promise(() => {}));
    renderAccount();
    const button = await screen.findByRole('button', { name: common.en.merge });
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(mocks.merge).toHaveBeenCalledOnce());
    expect(
      (screen.getByRole('button', { name: common.en.cancel }) as HTMLButtonElement).disabled
    ).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(useCallbackStore.getState().mergeUserStatus).toBe(MergeUserStatus.CANMERGE);
  });

  it('shows a backend error and allows retry after resolving it', async () => {
    mocks.merge.mockRejectedValueOnce({ code: 409, message: 'INSUFFICENT_BALANCE' });
    renderAccount();
    fireEvent.click(await screen.findByRole('button', { name: common.en.merge }));
    expect((await screen.findByRole('alert')).textContent).toBe(errors.en.INSUFFICENT_BALANCE);
    fireEvent.click(screen.getByRole('button', { name: common.en.merge }));
    await waitFor(() => expect(mocks.merge).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(useCallbackStore.getState().mergeUserStatus).toBe(MergeUserStatus.IDLE)
    );
  });

  it('discards an expired ticket and requires a new binding attempt', async () => {
    mocks.merge.mockRejectedValue({ code: 409, message: 'invalid code' });
    renderAccount();
    fireEvent.click(await screen.findByRole('button', { name: common.en.merge }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      common.en.verification_code_expired
    );
    expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
    expect(useCallbackStore.getState().mergeUserData).toBeUndefined();
  });

  it('removes an open merge action when the config becomes disabled', async () => {
    const view = renderAccount();
    await screen.findByRole('button', { name: common.en.merge });
    mocks.config.commonConfig = { accountMergeEnabled: false };
    view.rerender(wrap(<NeedToMerge />));
    expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
    expect(mocks.merge).not.toHaveBeenCalled();
  });
});

describe('phone binding merge dialog', () => {
  it.each([undefined, {}, { accountMergeEnabled: false }])(
    'keeps the current notice with config %j',
    async (config) => {
      mocks.config.commonConfig = config;
      renderPhone();
      await bindPhone();
      expect(screen.getByText(common.en.account_already_bound)).toBeTruthy();
      expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
      expect(mocks.merge).not.toHaveBeenCalled();
    }
  );

  it.each(['en', 'zh'] as const)('confirms the phone merge in %s', async (language) => {
    mocks.language = language;
    renderPhone();
    await bindPhone();
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: common[language].merge }));
    await waitFor(() => expect(mocks.merge).toHaveBeenCalledWith(mergeData));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(client.invalidateQueries).toHaveBeenCalledOnce();
  });

  it.each([
    { code: 203, message: 'USER_MERGE', data: {} },
    { code: 203, message: 'PROVIDER_CONFLICT', data: {} }
  ])('does not merge without a valid ticket: %j', async (response) => {
    mocks.verify.mockResolvedValue(response);
    renderPhone();
    await bindPhone();
    expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
    expect(mocks.merge).not.toHaveBeenCalled();
  });

  it('discards the pending merge when returning to binding', async () => {
    renderPhone();
    await bindPhone();
    fireEvent.click(screen.getByRole('button', { name: common.en.cancel }));
    expect(screen.getByRole('button', { name: common.en.complete_binding })).toBeTruthy();
    expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
    expect(mocks.merge).not.toHaveBeenCalled();
  });

  it('discards the confirmation when closing and reopening', async () => {
    const view = renderPhone();
    await bindPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(wrap(<PhoneBindingModal isOpen={false} onClose={onClose} />));
    view.rerender(wrap(<PhoneBindingModal isOpen onClose={onClose} />));
    await screen.findByRole('button', { name: common.en.complete_binding });
    expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
  });

  it('submits once and blocks dismissal while merging', async () => {
    mocks.merge.mockReturnValue(new Promise(() => {}));
    renderPhone();
    await bindPhone();
    const button = screen.getByRole('button', { name: common.en.merge });
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(mocks.merge).toHaveBeenCalledOnce());
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('shows a backend error without losing the confirmation', async () => {
    mocks.merge.mockRejectedValue({ code: 409, message: 'INSUFFICENT_BALANCE' });
    renderPhone();
    await bindPhone();
    fireEvent.click(screen.getByRole('button', { name: common.en.merge }));
    expect((await screen.findByRole('alert')).textContent).toBe(errors.en.INSUFFICENT_BALANCE);
    expect(screen.getByRole('button', { name: common.en.merge })).toBeTruthy();
  });

  it('returns to binding after a ticket expires', async () => {
    mocks.merge.mockRejectedValue({ code: 409, message: 'invalid code' });
    renderPhone();
    await bindPhone();
    fireEvent.click(screen.getByRole('button', { name: common.en.merge }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      common.en.verification_code_expired
    );
    expect(screen.getByRole('button', { name: common.en.complete_binding })).toBeTruthy();
    expect(screen.queryByRole('button', { name: common.en.merge })).toBeNull();
  });

  it('keeps an ordinary successful phone binding working while disabled', async () => {
    mocks.config.commonConfig = { accountMergeEnabled: false };
    mocks.verify.mockResolvedValue({ code: 200 });
    renderPhone();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '13800138000' } });
    fireEvent.change(inputs[1], { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: common.en.complete_binding }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mocks.merge).not.toHaveBeenCalled();
  });
});
