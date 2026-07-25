import { describe, expect, it } from 'vitest';
import {
  getCustomDomainCertificateCoverageFromState,
  parseCustomDomainCertificateDataSource,
  parseHigressCertificateDomains
} from '@/services/backend/customDomainCertificate';

describe('custom domain certificate runtime coverage', () => {
  it('parses Admin desired domains from data source ConfigMap YAML', () => {
    expect(
      parseCustomDomainCertificateDataSource(`
version: 1
domains:
  - name: Test.com.
  - name: '*.Test.com'
  - ignored.example.com
lastAppliedDomains:
  - old.example.com
`)
    ).toEqual(['test.com', '*.test.com', 'ignored.example.com']);
  });

  it('parses the Higress credential domains for the configured wildcard cert secret', () => {
    expect(
      parseHigressCertificateDomains(
        `
automaticHttps: false
credentialConfig:
  - domains:
      - '*.other.test'
    tlsSecret: sealos-system/other-cert
  - domains:
      - test.com
      - '*.test.com'
    tlsSecret: sealos-system/wildcard-cert
`,
        'wildcard-cert'
      )
    ).toEqual(['test.com', '*.test.com']);
  });

  it('returns covered when Admin, Certificate, and Higress all cover a wildcard domain', () => {
    expect(
      getCustomDomainCertificateCoverageFromState({
        customDomain: 'abc.test.com',
        state: {
          desiredDomains: ['*.test.com'],
          certificateDnsNames: ['*.test.com'],
          higressDomains: ['*.test.com'],
          certificateFound: true
        }
      })
    ).toEqual({
      customDomain: 'abc.test.com',
      status: 'covered',
      matchingDomain: '*.test.com'
    });
  });

  it('returns pendingSync when Admin covers the domain but runtime targets do not', () => {
    expect(
      getCustomDomainCertificateCoverageFromState({
        customDomain: 'abc.test.com',
        state: {
          desiredDomains: ['*.test.com'],
          certificateDnsNames: ['*.test.com'],
          higressDomains: ['test.com'],
          certificateFound: true
        }
      })
    ).toEqual({
      customDomain: 'abc.test.com',
      status: 'pendingSync',
      matchingDomain: '*.test.com',
      missingIn: ['higress']
    });
  });

  it('returns notConfigured when Admin desired state does not cover the domain', () => {
    expect(
      getCustomDomainCertificateCoverageFromState({
        customDomain: 'deep.abc.test.com',
        state: {
          desiredDomains: ['*.test.com'],
          certificateDnsNames: ['*.test.com'],
          higressDomains: ['*.test.com'],
          certificateFound: true
        }
      })
    ).toEqual({
      customDomain: 'deep.abc.test.com',
      status: 'notConfigured'
    });
  });
});
