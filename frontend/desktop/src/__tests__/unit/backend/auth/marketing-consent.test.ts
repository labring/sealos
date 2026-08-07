import { verify } from 'jsonwebtoken';

import { generateMarketingConsentToken, marketingConsentJwtSecret } from '@/services/backend/auth';

describe('marketing consent token', () => {
  const previousConfig = global.AppConfig;

  beforeEach(() => {
    global.AppConfig = {
      cloud: { regionUID: 'region-test' },
      desktop: { auth: { jwt: { marketingConsent: 'marketing-secret-test' } } }
    } as typeof global.AppConfig;
  });

  afterEach(() => {
    global.AppConfig = previousConfig;
  });

  it('issues a short-lived token with the Brain contract claims', () => {
    const token = generateMarketingConsentToken({
      ad_personalization: 'granted',
      ad_user_data_consent: 'granted',
      attribution_hash: 'hash-test',
      region: 'region-test',
      sub: 'user-test'
    });
    const payload = verify(token, marketingConsentJwtSecret(), {
      audience: 'brain-marketing-attribution',
      issuer: 'sealos-desktop'
    });

    expect(payload).toMatchObject({
      ad_personalization: 'granted',
      ad_user_data_consent: 'granted',
      attribution_hash: 'hash-test',
      consent_source: 'desktop_oauth',
      region: 'region-test',
      sub: 'user-test'
    });
    expect(payload).toHaveProperty('jti');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
  });
});
