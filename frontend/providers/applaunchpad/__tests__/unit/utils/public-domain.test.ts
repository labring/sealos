import { afterEach, describe, expect, it } from 'vitest';
import {
  isCustomPublicDomainPrefixEnabled,
  isImagePortsEnabled
} from '@/utils/feature-gates';
import { setPublicDomainReservedPrefixes, validatePublicDomainPrefix } from '@/utils/public-domain';
import {
  getPublicDomainConflictResponse,
  isIngressPublicDomainConflictError
} from '@/services/backend/publicDomain';

describe('validatePublicDomainPrefix', () => {
  afterEach(() => {
    setPublicDomainReservedPrefixes([]);
  });

  it('normalizes and accepts dns-safe prefixes', () => {
    expect(validatePublicDomainPrefix(' My-App1 ')).toEqual({
      valid: true,
      value: 'my-app1'
    });
  });

  it('rejects reserved prefixes', () => {
    setPublicDomainReservedPrefixes(['admin']);

    expect(validatePublicDomainPrefix('admin')).toEqual({
      valid: false,
      value: 'admin',
      reason: 'reserved'
    });
  });

  it('rejects invalid dns label shapes', () => {
    expect(validatePublicDomainPrefix('-bad')).toMatchObject({ valid: false, reason: 'format' });
    expect(validatePublicDomainPrefix('bad-')).toMatchObject({ valid: false, reason: 'format' });
    expect(validatePublicDomainPrefix('ab')).toMatchObject({ valid: false, reason: 'format' });
  });
});

describe('feature gates', () => {
  it('defaults branch feature gates to disabled', () => {
    expect(isImagePortsEnabled()).toBe(false);
    expect(isCustomPublicDomainPrefixEnabled()).toBe(false);
  });

  it('reads branch feature gates from config', () => {
    const config = {
      launchpad: {
        imagePorts: {
          enabled: true
        },
        publicDomain: {
          customPrefixEnabled: true
        }
      }
    };

    expect(isImagePortsEnabled(config)).toBe(true);
    expect(isCustomPublicDomainPrefixEnabled(config)).toBe(true);
  });
});

describe('isIngressPublicDomainConflictError', () => {
  it('detects ingress admission owner conflicts', () => {
    const error = {
      body: {
        message:
          'admission webhook "vingress.sealos.io" denied the request: 40301: ingress host demo.cloud.sealos.io is owned by other user, you can not create ingress with same host.'
      }
    };

    expect(isIngressPublicDomainConflictError(error)).toBe(true);
    expect(getPublicDomainConflictResponse(error)).toMatchObject({
      code: 'PUBLIC_DOMAIN_CONFLICT',
      message: 'Public domain is already in use by another workspace.'
    });
  });

  it('detects ingress admission owner conflicts from Kubernetes Error body', () => {
    const error = new Error('Forbidden');
    Object.assign(error, {
      body: {
        message:
          'admission webhook "vingress.sealos.io" denied the request: 40301: ingress host devbox.192.168.13.209.nip.io is owned by other user, you can not create ingress with same host.'
      }
    });

    expect(isIngressPublicDomainConflictError(error)).toBe(true);
    expect(getPublicDomainConflictResponse(error)).toMatchObject({
      code: 'PUBLIC_DOMAIN_CONFLICT',
      details:
        'admission webhook "vingress.sealos.io" denied the request: 40301: ingress host devbox.192.168.13.209.nip.io is owned by other user, you can not create ingress with same host.'
    });
  });

  it('does not treat other admission failures as public domain conflicts', () => {
    expect(
      isIngressPublicDomainConflictError({
        body: {
          message:
            'admission webhook "vingress.sealos.io" denied the request: 40300: can not verify ingress host'
        }
      })
    ).toBe(false);
  });
});
