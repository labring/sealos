import { describe, expect, it, vi } from 'vitest';
import {
  brainAnalyticsAttribution,
  createBrainAnalyticsRelay,
  isBrainAnalyticsSender
} from '@/utils/brain-analytics';

function setup(gtmEnabled = true) {
  const pushGtm = vi.fn();
  const client = { event: vi.fn(), identify: vi.fn(), getUserId: () => null };
  const relay = createBrainAnalyticsRelay({
    gtmEnabled: () => gtmEnabled,
    userId: () => 'desktop-uuid',
    properties: () => ({ product_user_id: 'desktop-uuid', first_source: 'google' }),
    rybbit: () => client,
    pushGtm
  });
  return { relay, pushGtm, client };
}

describe('Brain analytics relay', () => {
  it('forwards deployment creation through parent GTM exactly once', () => {
    const { relay, pushGtm, client } = setup();
    expect(
      relay({
        event: 'deployment_create',
        module: 'brain',
        method: 'template',
        config: { template_name: 'dify' }
      })
    ).toEqual({ accepted: true });
    expect(pushGtm).toHaveBeenCalledExactlyOnceWith({
      event: 'deployment_create',
      context: 'app',
      module: 'brain',
      method: 'template',
      config: { template_name: 'dify' }
    });
    expect(client.event).not.toHaveBeenCalled();
  });

  it('sends onboarding through Rybbit with the Desktop UUID and attribution', () => {
    const { relay, pushGtm, client } = setup();
    relay({ event: 'onboarding_step_view', module: 'brain', step: 2 });
    expect(client.identify).toHaveBeenCalledExactlyOnceWith('desktop-uuid');
    expect(client.event).toHaveBeenCalledExactlyOnceWith('onboarding_step_view', {
      context: 'app',
      module: 'brain',
      surface: 'product',
      step: 2,
      product_user_id: 'desktop-uuid',
      first_source: 'google'
    });
    expect(pushGtm).not.toHaveBeenCalled();
  });

  it('uses direct Rybbit when GTM is disabled', () => {
    const { relay, pushGtm, client } = setup(false);
    relay({ event: 'deployment_create', module: 'brain', method: 'docker' });
    expect(client.event).toHaveBeenCalledTimes(1);
    expect(pushGtm).not.toHaveBeenCalled();
  });

  it('does not accept unrelated events or copy credentials and feedback text', () => {
    const { relay, pushGtm, client } = setup();
    expect(relay({ event: 'login_success', module: 'brain' })).toEqual({ accepted: false });
    expect(relay({ event: 'module_view', module: 'other' })).toEqual({ accepted: false });
    relay({
      event: 'subscription_cancel',
      module: 'brain',
      plan_name: 'Pro',
      has_feedback: true,
      reasons: ['cost'],
      feedback: 'private text',
      token: 'secret'
    });
    expect(client.event).toHaveBeenCalledExactlyOnceWith('subscription_cancel', {
      context: 'app',
      module: 'brain',
      surface: 'product',
      product_user_id: 'desktop-uuid',
      first_source: 'google',
      plan_name: 'Pro',
      has_feedback: 'true',
      reasons: '["cost"]'
    });
    expect(pushGtm).not.toHaveBeenCalled();
  });

  it('buffers direct events while the Rybbit script loads', () => {
    vi.useFakeTimers();
    const client = { event: vi.fn(), identify: vi.fn() };
    const rybbit = vi.fn().mockReturnValueOnce(undefined).mockReturnValue(client);
    vi.stubGlobal('window', { setTimeout });
    try {
      const relay = createBrainAnalyticsRelay({
        gtmEnabled: () => true,
        userId: () => 'desktop-uuid',
        properties: () => ({}),
        rybbit,
        pushGtm: vi.fn()
      });
      relay({ event: 'onboarding_complete', module: 'brain' });
      expect(client.event).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(client.event).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('keeps direct properties within the Rybbit byte budget', () => {
    const event = vi.fn();
    const relay = createBrainAnalyticsRelay({
      gtmEnabled: () => true,
      userId: () => 'desktop-uuid',
      properties: () => ({
        product_user_id: 'desktop-uuid',
        first_campaign: '部署'.repeat(400),
        last_campaign: '部署'.repeat(400)
      }),
      rybbit: () => ({ event, identify: vi.fn() }),
      pushGtm: vi.fn()
    });
    relay({
      event: 'subscription_cancel',
      module: 'brain',
      plan_name: 'Pro',
      has_feedback: true,
      reasons: ['cost']
    });
    const props = event.mock.calls[0][1];
    expect(new TextEncoder().encode(JSON.stringify(props)).byteLength).toBeLessThan(1900);
    expect(props.product_user_id).toBe('desktop-uuid');
    expect(props.plan_name).toBe('Pro');
  });

  it('rejects a different iframe or a mismatched origin', () => {
    const frame = {} as Window;
    const sender = { source: frame, origin: 'https://brain.usw-1.sealos.io' };
    expect(isBrainAnalyticsSender(sender, frame, 'https://brain.usw-1.sealos.io/project')).toBe(
      true
    );
    expect(isBrainAnalyticsSender(sender, {} as Window, 'https://brain.usw-1.sealos.io')).toBe(
      false
    );
    expect(
      isBrainAnalyticsSender(
        { ...sender, origin: 'https://other.sealos.io' },
        frame,
        'https://brain.usw-1.sealos.io'
      )
    ).toBe(false);
    expect(isBrainAnalyticsSender(sender, frame, 'not a URL')).toBe(false);
  });

  it('reads attribution without copying consent proof or click identifiers', () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          version: 2,
          consent_token: 'proof',
          first_touch: { source: 'google', click_id_value: 'private-click', campaign: 'launch' }
        })
    };
    expect(brainAnalyticsAttribution(storage)).toEqual({
      attr_version: '2',
      first_source: 'google',
      first_campaign: 'launch'
    });
    expect(brainAnalyticsAttribution({ getItem: () => '{broken' })).toEqual({});
  });
});
