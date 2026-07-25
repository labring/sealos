import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/platform/checkCustomDomainCertificate';

const authSessionMock = vi.hoisted(() => vi.fn());
const getCustomDomainCertificateCoverageMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/backend/auth', () => ({
  authSession: authSessionMock
}));

vi.mock('@/services/backend/customDomainCertificate', () => ({
  getCustomDomainCertificateCoverage: getCustomDomainCertificateCoverageMock
}));

function createRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  return {
    method: options.method ?? 'POST',
    headers: options.headers ?? {},
    body: options.body ?? {
      customDomain: 'app.example.com'
    }
  } as any;
}

function createResponse() {
  return {
    setHeader: vi.fn(),
    json: vi.fn((payload) => payload)
  } as any;
}

function setCustomDomainMode(mode: 'cname' | 'certificate') {
  (global as any).AppConfig = {
    launchpad: {
      customDomain: {
        mode,
        certificate: {
          tlsSecretName: 'wildcard-cert'
        }
      }
    }
  };
}

describe('/api/platform/checkCustomDomainCertificate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCustomDomainMode('certificate');
    authSessionMock.mockResolvedValue('kubeconfig');
    getCustomDomainCertificateCoverageMock.mockResolvedValue({
      customDomain: 'app.example.com',
      status: 'covered',
      matchingDomain: '*.example.com'
    });
  });

  it('rejects unauthenticated requests before reading certificate state', async () => {
    authSessionMock.mockRejectedValue('unAuthorization');
    const res = createResponse();

    await handler(
      createRequest({
        headers: {}
      }),
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 401,
        error: 'Unauthorized'
      })
    );
    expect(getCustomDomainCertificateCoverageMock).not.toHaveBeenCalled();
  });

  it('keeps the unsupported response for authenticated requests when certificate mode is disabled', async () => {
    setCustomDomainMode('cname');
    const res = createResponse();

    await handler(
      createRequest({
        headers: {
          authorization: encodeURIComponent('kubeconfig')
        }
      }),
      res
    );

    expect(authSessionMock).toHaveBeenCalled();
    expect(getCustomDomainCertificateCoverageMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: {
          customDomain: 'app.example.com',
          status: 'unsupported',
          reason: 'Custom domain certificate mode is disabled'
        }
      })
    );
  });

  it('checks coverage for authenticated certificate-mode requests', async () => {
    const res = createResponse();

    await handler(
      createRequest({
        headers: {
          authorization: encodeURIComponent('kubeconfig')
        },
        body: {
          customDomain: ' App.Example.com. '
        }
      }),
      res
    );

    expect(getCustomDomainCertificateCoverageMock).toHaveBeenCalledWith({
      customDomain: 'app.example.com',
      tlsSecretName: 'wildcard-cert'
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: {
          customDomain: 'app.example.com',
          status: 'covered',
          matchingDomain: '*.example.com'
        }
      })
    );
  });
});
