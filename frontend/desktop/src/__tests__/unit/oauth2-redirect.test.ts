/** @jest-environment jsdom */
import {
  setPendingOauth2RequestId,
  setPendingCodeRequestId,
  consumePendingOauth2RedirectPath
} from '@/utils/oauth2';

describe('OAuth redirect after release-v5.1 workspace initialization', () => {
  beforeEach(() => sessionStorage.clear());

  it.each(['device', 'code'])('resumes the %s request once after initialization', (flow) => {
    if (flow === 'device') setPendingOauth2RequestId('pending-request');
    else setPendingCodeRequestId('pending-request');
    // The pending request survives navigation through the manual workspace page.
    expect(sessionStorage.length).toBe(1);
    expect(consumePendingOauth2RedirectPath()).toBe(
      `/oauth2/${flow === 'device' ? 'consent' : 'code'}?request_id=pending-request`
    );
    expect(consumePendingOauth2RedirectPath()).toBe('');
  });

  it('resumes only the most recently started flow', () => {
    setPendingOauth2RequestId('old-device');
    setPendingCodeRequestId('new-code');
    expect(consumePendingOauth2RedirectPath()).toBe('/oauth2/code?request_id=new-code');
    setPendingCodeRequestId('old-code');
    setPendingOauth2RequestId('new-device');
    expect(consumePendingOauth2RedirectPath()).toBe('/oauth2/consent?request_id=new-device');
  });
});
