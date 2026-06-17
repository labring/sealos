import { describe, expect, it } from 'vitest';
import {
  getCustomDomainBindings,
  getPublicDomainHost,
  normalizeDomainName
} from '@/utils/custom-domain';
import type { AppEditType } from '@/types/app';

const createNetwork = (
  network: Partial<AppEditType['networks'][number]>
): AppEditType['networks'][number] => ({
  networkName: 'network-test',
  portName: 'http',
  port: 80,
  protocol: 'TCP',
  appProtocol: 'HTTP',
  openPublicDomain: true,
  openNodePort: false,
  publicDomain: 'app',
  customDomain: '',
  domain: '192.168.13.209.nip.io',
  routes: [],
  ...network
});

describe('custom domain helpers', () => {
  it('normalizes DNS names before comparison or submission', () => {
    expect(normalizeDomainName(' Hello.ICLOUD.xxx.io. ')).toBe('hello.icloud.xxx.io');
    expect(normalizeDomainName('codex.192.168.13.209.nip.io...')).toBe(
      'codex.192.168.13.209.nip.io'
    );
  });

  it('builds the expected public domain host for CNAME records', () => {
    expect(
      getPublicDomainHost({
        publicDomain: ' Codex-MS100066-launch ',
        domain: '192.168.13.209.nip.io.'
      })
    ).toBe('codex-ms100066-launch.192.168.13.209.nip.io');
  });

  it('returns only public ingress custom domain bindings', () => {
    const bindings = getCustomDomainBindings([
      createNetwork({
        customDomain: ' Hello.ICLOUD.xxx.io. ',
        publicDomain: 'codex-ms100066-launch'
      }),
      createNetwork({
        openPublicDomain: false,
        openNodePort: true,
        customDomain: 'tcp.example.com'
      }),
      createNetwork({
        customDomain: ''
      })
    ]);

    expect(bindings).toEqual([
      {
        networkIndex: 0,
        customDomain: 'hello.icloud.xxx.io',
        publicDomain: 'codex-ms100066-launch.192.168.13.209.nip.io'
      }
    ]);
  });
});
