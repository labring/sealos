import { describe, expect, it } from 'vitest';
import { normalizeFeishuAppConfig } from '../../src/utils/feishu-config';

describe('normalizeFeishuAppConfig', () => {
  it('maps the legacy feishApp key to feishuApp', () => {
    const legacyApp = { appId: 'legacy-app' };
    const config = { costCenter: { invoice: { feishApp: legacyApp } } };

    expect((normalizeFeishuAppConfig(config) as any).costCenter.invoice.feishuApp).toBe(legacyApp);
  });

  it('prefers feishuApp when both keys are present', () => {
    const canonicalApp = { appId: 'canonical-app' };
    const config = {
      costCenter: {
        invoice: {
          feishuApp: canonicalApp,
          feishApp: { appId: 'legacy-app' }
        }
      }
    };

    expect((normalizeFeishuAppConfig(config) as any).costCenter.invoice.feishuApp).toBe(canonicalApp);
  });
});
