import { describe, expect, it } from 'vitest';
import { getTemplateAssetProxyUrl, proxyTemplateIconUrls } from '@/utils/templateAsset';

const repo = {
  url: 'https://gogs.192.168.0.62.nip.io/sealos-admin/templates',
  branch: 'main',
  provider: 'gogs' as const
};

describe('template asset URLs', () => {
  it('proxies repository icons so browsers receive the correct MIME type', () => {
    expect(
      getTemplateAssetProxyUrl(
        'https://gogs.192.168.0.62.nip.io/sealos-admin/templates/raw/main/template/ace-step/logo.svg',
        repo
      )
    ).toBe('/api/templateAsset?path=template%2Face-step%2Flogo.svg');
  });

  it('preserves already proxied and unrelated URLs', () => {
    const proxied = '/api/templateAsset?path=template%2Face-step%2Flogo.svg';
    const external = 'https://example.com/logo.svg';

    expect(getTemplateAssetProxyUrl(proxied, repo)).toBe(proxied);
    expect(getTemplateAssetProxyUrl(external, repo)).toBe(external);
  });

  it('supports instance resources as well as catalog templates', () => {
    const instance = {
      apiVersion: 'app.sealos.io/v1',
      kind: 'Instance',
      metadata: { name: 'ace-step' },
      spec: {
        icon: 'https://gogs.192.168.0.62.nip.io/sealos-admin/templates/raw/main/template/ace-step/logo.svg'
      }
    };

    expect(proxyTemplateIconUrls(instance, repo).spec.icon).toBe(
      '/api/templateAsset?path=template%2Face-step%2Flogo.svg'
    );
  });
});
