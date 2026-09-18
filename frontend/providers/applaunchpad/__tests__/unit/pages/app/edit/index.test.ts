import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('EditApp yaml display state', () => {
  it('keeps custom-domain verification yaml display masked while caching raw yaml', () => {
    const source = readFileSync(
      new URL('../../../../../src/pages/app/edit/index.tsx', import.meta.url),
      'utf8'
    );
    const start = source.indexOf('const handleDomainVerified = useCallback');
    const end = source.indexOf('useQuery(', start);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const handleDomainVerified = source.slice(start, end);

    expect(handleDomainVerified).toContain('formOldYamls.current = formData2Yamls(data);');
    expect(handleDomainVerified).toContain('setYamlList(formData2DisplayYamls(data));');
    expect(handleDomainVerified).not.toContain('setYamlList(formData2Yamls(data));');
  });

  it('allows deleting draft storage volumes while keeping the last applied one guarded', () => {
    const source = readFileSync(
      new URL('../../../../../src/pages/app/edit/components/Form.tsx', import.meta.url),
      'utf8'
    );
    const start = source.indexOf('{localStores.map((item) => {');

    expect(start).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('removeStoreList(originalIndex)')).toBeGreaterThan(start);
    expect(source).toMatch(
      /existingStores\.some\(\s*\(store\) => store\.path === item\.path\s*\)/
    );
    expect(source).toContain("t('Store At Least One')");
    expect(source).not.toContain('localStores.length === 1');
  });

  it('creates the missing ClusterIP service before applying a custom-domain ingress', () => {
    const source = readFileSync(
      new URL('../../../../../src/pages/app/edit/index.tsx', import.meta.url),
      'utf8'
    );
    const start = source.indexOf('const handleDomainVerified = useCallback');
    const end = source.indexOf('useQuery(', start);
    const handleDomainVerified = source.slice(start, end);

    expect(handleDomainVerified).toContain('shouldCreateClusterIpService');
    expect(handleDomainVerified).toContain('json2Service(data, ownerReferences, {');
    expect(handleDomainVerified).toContain('includeNodePort: false');
    expect(handleDomainVerified).toContain("postDeployApp(yamlList, 'replace')");
  });

  it('keeps Service identity when public-access changes do not require a new Service', () => {
    const source = readFileSync(
      new URL('../../../../../src/pages/app/edit/components/NetworkSection.tsx', import.meta.url),
      'utf8'
    );
    const helperStart = source.indexOf('const getServiceBindingNetwork');
    const helperEnd = source.indexOf('const getNextAvailablePort', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helperStart).toBeGreaterThanOrEqual(0);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helper).toContain('serviceIdentityChanges');
    expect(helper).toContain('? withoutMainServiceBinding(network)');
    expect(source).toMatch(
      /getServiceBindingNetwork\(\s*currentNetwork,\s*false,\s*'TCP'\s*\)/
    );
  });
});
