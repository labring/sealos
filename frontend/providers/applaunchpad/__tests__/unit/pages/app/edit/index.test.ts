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
});
