import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NetworkIsolationModal from '@/pages/app/edit/components/NetworkIsolationModal';
import type { NetworkIsolationConfig } from '@/types/networkIsolation';

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'network_isolation_rule_number'
        ? `Rule ${values?.number}`
        : key
  })
}));

vi.mock('@/components/Icon', () => ({
  default: () => <span data-testid="icon" />
}));

const savedConfig: NetworkIsolationConfig = {
  enabled: true,
  rules: [
    {
      id: 'stable-rule-id',
      type: 'application',
      sourceWorkspaceId: 'source-space',
      sourceApplicationId: 'source-app'
    }
  ]
};

const renderModal = (overrides: Partial<ComponentProps<typeof NetworkIsolationModal>> = {}) => {
  const props: ComponentProps<typeof NetworkIsolationModal> = {
    isOpen: true,
    value: savedConfig,
    isLoading: false,
    isSaving: false,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(true),
    ...overrides
  };
  render(
    <ChakraProvider>
      <NetworkIsolationModal {...props} />
    </ChakraProvider>
  );
  return props;
};

describe('NetworkIsolationModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides rules while strict mode is off and restores the same draft when enabled again', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByDisplayValue('source-space')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.queryByTestId('network-isolation-rules')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByDisplayValue('source-space')).toBeInTheDocument();
    expect(screen.getByDisplayValue('source-app')).toBeInTheDocument();
  });

  it('discards an unsaved draft when canceled and never calls onSave', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.clear(screen.getByDisplayValue('source-space'));
    await user.type(screen.getByPlaceholderText('network_isolation_workspace_placeholder'), 'changed');
    await user.click(screen.getByText('Cancel'));

    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('submits the normalized draft and closes only after a successful save', async () => {
    const props = renderModal();

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(props.onSave).toHaveBeenCalledOnce());
    expect(props.onSave).toHaveBeenCalledWith(savedConfig);
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('keeps the modal open when saving fails', async () => {
    const props = renderModal({ onSave: vi.fn().mockResolvedValue(false) });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(props.onSave).toHaveBeenCalledOnce());
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
