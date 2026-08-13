import { verify } from 'jsonwebtoken';

import handler from '@/pages/api/marketing/consent-token';
import {
  generateGlobalAccessToken,
  generateMarketingConsentToken,
  marketingConsentJwtSecret
} from '@/services/backend/auth';

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

  it('does not elevate consent from browser attribution input', async () => {
    const globalToken = generateGlobalAccessToken({
      preferred_username: 'user-test',
      sub: 'user-test',
      user_id: '10001'
    });
    let responseBody: any;
    const res = {
      json: vi.fn((body) => {
        responseBody = body;
      }),
      setHeader: vi.fn()
    } as any;
    const seaAttr = Buffer.from(
      JSON.stringify({ ad_personalization: 'granted', ad_user_data_consent: 'granted' })
    ).toString('base64url');

    await handler(
      {
        body: { sea_attr: seaAttr },
        cookies: {},
        headers: { authorization: encodeURIComponent(globalToken) },
        method: 'POST'
      } as any,
      res
    );

    expect(
      verify(responseBody.data.token, marketingConsentJwtSecret(), {
        audience: 'brain-marketing-attribution',
        issuer: 'sealos-desktop'
      })
    ).toMatchObject({
      ad_personalization: 'unspecified',
      ad_user_data_consent: 'unspecified',
      sub: 'user-test'
    });
  });
});
