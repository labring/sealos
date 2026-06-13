import { describe, expect, it } from 'vitest';
import { validatePublicDomainPrefix } from '@/utils/public-domain';
import {
  getPublicDomainConflictResponse,
  isIngressPublicDomainConflictError
} from '@/services/backend/publicDomain';

describe('validatePublicDomainPrefix', () => {
  it('normalizes and accepts dns-safe prefixes', () => {
    expect(validatePublicDomainPrefix(' My-App1 ')).toEqual({
      valid: true,
      value: 'my-app1'
    });
  });

  it('rejects reserved prefixes', () => {
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
