import { afterEach, describe, expect, it } from 'vitest';
import type { AppConfigType } from '@/types/system';
import { isActivityAvailable } from '@/services/enable';

// desktop.activity.enabled is the dedicated switch for the acquisition rewards.
// A missing key must keep the pre-flag behaviour (available) so an upgrade never
// silently turns the activity off for existing CN deployments; the switch can
// only turn it off, never turn it on for the international deployment.
const configFor = (version: 'cn' | 'en', activity?: { enabled?: boolean }): AppConfigType =>
  ({ desktop: { layout: { version }, ...(activity ? { activity } : {}) } } as AppConfigType);

describe('activity availability switch', () => {
  const previousConfig = (global as { AppConfig?: unknown }).AppConfig;

  afterEach(() => {
    (global as { AppConfig?: unknown }).AppConfig = previousConfig;
  });

  it('stays available for CN deployments that predate the switch', () => {
    global.AppConfig = configFor('cn');
    expect(isActivityAvailable()).toBe(true);
  });

  it('can be switched off explicitly', () => {
    global.AppConfig = configFor('cn', { enabled: false });
    expect(isActivityAvailable()).toBe(false);
  });

  it('stays available when explicitly enabled', () => {
    global.AppConfig = configFor('cn', { enabled: true });
    expect(isActivityAvailable()).toBe(true);
  });

  it('is never available on international deployments regardless of the switch', () => {
    global.AppConfig = configFor('en', { enabled: true });
    expect(isActivityAvailable()).toBe(false);
  });
});
