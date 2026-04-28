// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

async function importCheckDomainICP() {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchMock);
  global.AppConfig = {
    launchpad: {
      checkIcpReg: {
        endpoint: 'cdn.aliyuncs.com',
        accessKeyID: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret'
      }
    }
  } as typeof global.AppConfig;

  return import('@/services/backend/acsCdnActions');
}

describe('checkDomainICP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns registered true for DomainIsRegistration responses', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ Status: 'DomainIsRegistration' })));
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: true,
      data: {
        domain: 'example.com',
        icpRegistered: true
      }
    });
  });

  it('returns registered false for DomainNotRegistration responses', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ Status: 'DomainNotRegistration' })));
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: true,
      data: {
        domain: 'example.com',
        icpRegistered: false
      }
    });
  });

  it('sends CheckCdnDomainICP with the requested domain', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ Status: 'DomainIsRegistration' })));
    const { checkDomainICP } = await importCheckDomainICP();

    await checkDomainICP('example.com');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://cdn.aliyuncs.com/');
    expect(request.headers.get('x-acs-action')).toBe('CheckCdnDomainICP');
    expect(request.headers.get('x-acs-version')).toBe('2018-05-10');
    await expect(request.json()).resolves.toEqual({ DomainName: 'example.com' });
  });

  it('returns an error when ACS responds with a non-2xx error payload', async () => {
    const upstreamError = {
      Code: 'InvalidAccessKeyId.NotFound',
      Message: 'The Access Key ID provided does not exist in our records.'
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(upstreamError), {
        status: 400,
        statusText: 'Bad Request'
      })
    );
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: false,
      cause: upstreamError
    });
  });

  it('returns an error when ACS returns an unexpected success payload', async () => {
    const unexpectedPayload = {
      RequestId: 'request-id',
      Code: 'SignatureDoesNotMatch',
      Message: 'Specified signature is not matched with our calculation.'
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(unexpectedPayload)));
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: false,
      cause: unexpectedPayload
    });
  });

  it('returns an error when ACS returns an unknown ICP status', async () => {
    const unexpectedPayload = { Status: 'UnknownStatus' };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(unexpectedPayload)));
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: false,
      cause: unexpectedPayload
    });
  });

  it('returns text as the error cause for non-json ACS errors', async () => {
    fetchMock.mockResolvedValue(new Response('Forbidden', { status: 403 }));
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: false,
      cause: 'Forbidden'
    });
  });

  it('returns the thrown error when the ACS request rejects', async () => {
    const cause = new Error('network error');
    fetchMock.mockRejectedValue(cause);
    const { checkDomainICP } = await importCheckDomainICP();

    await expect(checkDomainICP('example.com')).resolves.toEqual({
      success: false,
      cause
    });
  });
});
