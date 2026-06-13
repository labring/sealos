import { describe, expect, it } from 'vitest';
import { parseExposedPorts, parseImageRef } from '@/utils/image-exposed-ports';

describe('parseExposedPorts', () => {
  it('parses, normalizes, deduplicates, and sorts exposed ports', () => {
    expect(
      parseExposedPorts({
        '8080/tcp': {},
        '80/TCP': {},
        '53/udp': {},
        '80/tcp': {},
        '70000/tcp': {},
        bad: {}
      })
    ).toEqual([
      { port: 53, protocol: 'UDP' },
      { port: 80, protocol: 'TCP' },
      { port: 8080, protocol: 'TCP' }
    ]);
  });
});

describe('parseImageRef', () => {
  it('keeps digest references intact and strips optional tags from the repository', () => {
    expect(parseImageRef('nginx:1.27@sha256:abc123')).toEqual({
      registry: 'registry-1.docker.io',
      repository: 'library/nginx',
      reference: 'sha256:abc123'
    });
  });

  it('respects private registry overrides without rewriting repository paths', () => {
    expect(parseImageRef('team/api:1.0.0', 'registry.example.com')).toEqual({
      registry: 'registry.example.com',
      repository: 'team/api',
      reference: '1.0.0'
    });
  });
});
