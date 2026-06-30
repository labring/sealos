import '@/styles/tailwind.css';

import { cleanup, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import NetworkConfigurationTable, {
  type NetworkConfigurationTableItem
} from '@/components/app/detail/index/NetworkConfigurationTable';

vi.mock('@sealos/shadcn-ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/components/app/detail/index/ICPStatus', () => ({
  default: ({
    onRegistrationStatusChange
  }: {
    onRegistrationStatusChange?: (registered: boolean) => void;
  }) => {
    React.useEffect(() => {
      onRegistrationStatusChange?.(false);
    }, [onRegistrationStatusChange]);

    return <span data-testid="icp-status">Domain not filed</span>;
  }
}));

const publicAddress = 'https://very-long-public-domain-for-layout-regression.gzg.sealos.run';

const networks: NetworkConfigurationTableItem[] = [
  {
    inline: 'http://hello-world.ns-test.svc.cluster.local:8080',
    public: publicAddress,
    customDomain: '',
    showReadyStatus: true,
    port: 8080
  }
];

const renderNetworkConfigurationTable = () => {
  return render(
    <div style={{ width: 360 }}>
      <NetworkConfigurationTable
        networks={networks}
        networkStatus={[{ ready: true, url: publicAddress }]}
        statusMap={{
          [publicAddress]: {
            ready: true,
            url: publicAddress
          }
        }}
        copyData={vi.fn()}
        t={(key) => key}
      />
    </div>
  );
};

const getLineTop = (element: Element) => Math.round(element.getBoundingClientRect().top);
const expectOnSameLine = (left: Element, right: Element) => {
  expect(Math.abs(getLineTop(left) - getLineTop(right))).toBeLessThanOrEqual(2);
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NetworkConfigurationTable layout', () => {
  test('keeps the network table inside its parent in a narrow viewport', async () => {
    await page.viewport(390, 844);
    renderNetworkConfigurationTable();

    const table = screen.getByRole('table');
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    const publicCell = within(table).getByText(publicAddress).closest('td');
    const accessibleTag = screen.getByText('Accessible');
    const renderedPublicAddress = screen.getByText(publicAddress);
    const publicContentRow = publicCell?.firstElementChild;
    const scrollContainer = table.parentElement as HTMLElement;

    expect(tableHead).toBeTruthy();
    expect(tableBody).toBeTruthy();
    expect(publicCell).toBeTruthy();
    expect(publicContentRow).toBeTruthy();

    expect(getComputedStyle(table).tableLayout).toBe('fixed');
    expect(Math.round(table.getBoundingClientRect().width)).toBeLessThanOrEqual(
      scrollContainer.clientWidth
    );
    expect(renderedPublicAddress.getBoundingClientRect().width).toBeLessThanOrEqual(220);
    expectOnSameLine(accessibleTag, renderedPublicAddress);
  });

  test('shows the ICP tag as the only left status tag when domain is unregistered', async () => {
    await page.viewport(390, 844);
    render(
      <NetworkConfigurationTable
        networks={[
          {
            ...networks[0],
            customDomain: 'example.com'
          }
        ]}
        networkStatus={[{ ready: true, url: publicAddress }]}
        statusMap={{
          [publicAddress]: {
            ready: true,
            url: publicAddress
          }
        }}
        copyData={vi.fn()}
        t={(key) => key}
      />
    );

    const icpTag = screen.getByTestId('icp-status');
    const renderedPublicAddress = screen.getByText(publicAddress);

    expect(screen.queryByText('Accessible')).toBeNull();
    expect(screen.queryByText('Ready')).toBeNull();
    expect(icpTag.getBoundingClientRect().left).toBeLessThan(
      renderedPublicAddress.getBoundingClientRect().left
    );
    expectOnSameLine(icpTag, renderedPublicAddress);
  });
});
