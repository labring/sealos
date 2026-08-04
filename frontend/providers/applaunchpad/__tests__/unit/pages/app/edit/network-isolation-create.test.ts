import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), 'src/pages/app/edit', relativePath), 'utf8');

describe('new application network isolation contract', () => {
  it('renders the configure action next to the add-port action for both create and edit', () => {
    const source = readSource('components/NetworkSection.tsx');
    const addPort = source.indexOf("{t('Add Network Port')}");
    const configure = source.indexOf("{t('network_isolation_configure')}", addPort);
    const actionsEnd = source.indexOf('</Flex>', configure);

    expect(addPort).toBeGreaterThanOrEqual(0);
    expect(configure).toBeGreaterThan(addPort);
    expect(configure).toBeLessThan(actionsEnd);
    expect(source.slice(addPort, configure)).not.toContain('isEdit && appName');
  });

  it('preserves IP-port access controls and workload locking after adding the action', () => {
    const source = readSource('components/NetworkSection.tsx');

    expect(source).toContain('NODE_PORT_HOST');
    expect(source).toContain('UPDATE_ACCESS_MODE');
    expect(source).toContain('shouldShowAccessModeSelector');
    expect(source).toContain('network.appProtocol ||');
    expect(source).toContain("network.openNodePort ? network.protocol : 'HTTP'");
    expect(source).toContain("<Box as={'fieldset'} disabled={isWorkloadLocked}>");
    expect(source).toContain("data-testid={'network-actions'}");
    expect(source).toContain('isDisabled={isWorkloadLocked}');
  });

  it('saves create-page modal values to the page draft without calling the API', () => {
    const source = readSource('components/NetworkSection.tsx');
    const start = source.indexOf('const saveNetworkIsolation = useCallback');
    const end = source.indexOf('const openNetworkIsolation', start);
    const save = source.slice(start, end);

    expect(save).toContain('if (!isEdit)');
    expect(save).toContain('onCreateDraftChange?.(config)');
    expect(save.indexOf('onCreateDraftChange?.(config)')).toBeLessThan(
      save.indexOf('putNetworkIsolation(')
    );
  });

  it('does not load remote configuration when opening the modal on the create page', () => {
    const source = readSource('components/NetworkSection.tsx');
    const start = source.indexOf('const openNetworkIsolation = useCallback');
    const end = source.indexOf('useEffect(', start);
    const open = source.slice(start, end);

    expect(open).toContain('if (isEdit) void loadNetworkIsolation()');
  });

  it('uses the server-provided application name to select edit mode', () => {
    const formSource = readSource('components/Form.tsx');
    const pageSource = readSource('index.tsx');

    expect(formSource).toContain('const isEdit = !!editAppName');
    expect(formSource).toContain("appName={editAppName || getValues('appName')}");
    expect(pageSource).toContain('editAppName={appName}');
  });

  it('keeps a pending create draft outside AppEditType and retries without redeploying', () => {
    const source = readSource('index.tsx');

    expect(source).toContain(
      'const [networkIsolationDraft, setNetworkIsolationDraft] = useState<NetworkIsolationConfig>()'
    );
    expect(source).toContain('appAlreadyCreated: true');
    expect(source).toContain('createdAppPendingIsolation || updatedAppPendingIsolation');
    expect(source).toContain("? 'network_isolation_retry_sync'");
  });
});
