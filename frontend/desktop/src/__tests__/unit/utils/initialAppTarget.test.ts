import { describe, expect, it } from 'vitest';

import { resolveInitialAppTarget } from '@/utils/initialAppTarget';

const installedAppKeys = ['system-brain', 'system-template', 'system-devbox'];

const resolve = (overrides: Partial<Parameters<typeof resolveInitialAppTarget>[0]> = {}) =>
  resolveInitialAppTarget({
    installedAppKeys,
    hasOpenAppQuery: false,
    restoreAppKeys: [],
    defaultAppKey: 'system-brain',
    ...overrides
  });

describe('resolveInitialAppTarget', () => {
  it('keeps an autolaunch target ahead of the normal root-path selection', () => {
    expect(
      resolve({
        autolaunchAppKey: 'system-devbox',
        hasOpenAppQuery: true,
        queryAppKey: 'system-template',
        restoreAppKeys: ['system-brain']
      })
    ).toEqual({
      kind: 'app',
      appKey: 'system-devbox',
      source: 'autolaunch'
    });
  });

  it('treats an empty openapp query as an explicit Desktop target', () => {
    expect(
      resolve({
        hasOpenAppQuery: true,
        queryAppKey: '',
        restoreAppKeys: ['system-template']
      })
    ).toEqual({
      kind: 'desktop',
      source: 'explicit-desktop'
    });
  });

  it('opens an explicitly requested app before a restorable or default app', () => {
    expect(
      resolve({
        hasOpenAppQuery: true,
        queryAppKey: 'system-devbox',
        restoreAppKeys: ['system-template']
      })
    ).toEqual({
      kind: 'app',
      appKey: 'system-devbox',
      source: 'query'
    });
  });

  it('stays on Desktop when an explicit app is unavailable', () => {
    expect(
      resolve({
        hasOpenAppQuery: true,
        queryAppKey: 'system-missing',
        restoreAppKeys: ['system-template']
      })
    ).toEqual({
      kind: 'desktop',
      source: 'explicit-unavailable'
    });
  });

  it('restores a fullscreen app before selecting Brain as the default', () => {
    expect(resolve({ restoreAppKeys: ['system-template'] })).toEqual({
      kind: 'app',
      appKey: 'system-template',
      source: 'restore'
    });
  });

  it('uses the first valid restore candidate', () => {
    expect(resolve({ restoreAppKeys: ['system-missing', 'system-devbox'] })).toEqual({
      kind: 'app',
      appKey: 'system-devbox',
      source: 'restore'
    });
  });

  it('prefers the tab-local restore candidate when both restore candidates are valid', () => {
    expect(resolve({ restoreAppKeys: ['system-template', 'system-brain'] })).toEqual({
      kind: 'app',
      appKey: 'system-template',
      source: 'restore'
    });
  });

  it('defaults to Brain only when there is no explicit or restorable target', () => {
    expect(resolve()).toEqual({
      kind: 'app',
      appKey: 'system-brain',
      source: 'default'
    });
  });

  it('falls back to Desktop when Brain is not installed', () => {
    expect(resolve({ installedAppKeys: ['system-template'] })).toEqual({
      kind: 'desktop',
      source: 'fallback'
    });
  });

  it('does not open a target that is unavailable in guest mode', () => {
    expect(
      resolve({
        hasOpenAppQuery: true,
        queryAppKey: 'system-template',
        allowedAppKeys: ['system-brain']
      })
    ).toEqual({
      kind: 'desktop',
      source: 'explicit-unavailable'
    });
  });
});
