import { beforeEach, describe, expect, it, vi } from 'vitest';
import OAuth from '@/pages/oauth';

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, string | string[]>,
  loggedIn: false,
  replace: vi.fn(),
  setAutoLaunch: vi.fn(),
  cancelAutoDeployTemplate: vi.fn(),
  setAutoDeployTemplate: vi.fn()
}));

// Run the route effect directly; authentication and navigation are external boundaries.
vi.mock('react', () => ({
  useEffect: (effect: () => void) => effect(),
  useRef: (current: unknown) => ({ current })
}));
vi.mock('next/router', () => ({
  useRouter: () => ({ isReady: true, query: mocks.query, replace: mocks.replace })
}));
vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({ authConfig: { idp: {} } })
}));
vi.mock('@/stores/session', () => ({
  default: () => ({ isUserLogin: () => mocks.loggedIn })
}));
vi.mock('@/stores/app', () => ({
  BRAIN_APP_KEY: 'system-brain',
  default: () => ({
    setAutoLaunch: mocks.setAutoLaunch,
    cancelAutoDeployTemplate: mocks.cancelAutoDeployTemplate,
    setAutoDeployTemplate: mocks.setAutoDeployTemplate
  })
}));
vi.mock('@/stores/guideModal', () => ({ useGuideModalStore: () => ({}) }));
vi.mock('@tanstack/react-query', () => ({ useMutation: () => ({}) }));
vi.mock('@/hooks/useCustomToast', () => ({ useCustomToast: () => ({}) }));
vi.mock('@/utils/gtm', () => ({ gtmLoginStart: vi.fn() }));
vi.mock('@/utils/ssrLocale', () => ({ ensureLocaleCookie: vi.fn() }));
vi.mock('@/api/platform', () => ({ createTemplateInstance: vi.fn() }));
vi.mock('@/api/auth', () => ({ getRegionToken: vi.fn(), initRegionToken: vi.fn() }));
vi.mock('@/api/namespace', () => ({ nsListRequest: vi.fn(), switchRequest: vi.fn() }));
vi.mock('@/utils/sessionConfig', () => ({ sessionConfig: vi.fn() }));
vi.mock('@/utils/switchKubeconfigNamespace', () => ({ switchKubeconfigNamespace: vi.fn() }));

describe('GitHub deploy OAuth entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loggedIn = false;
    mocks.query = {
      openapp: 'system-brain',
      githubRepo: 'https://github.com/example/repository',
      autoDeploy: '1'
    };
  });

  it('saves the complete deploy destination before redirecting to sign-in', () => {
    OAuth();

    expect(mocks.setAutoLaunch).toHaveBeenCalledExactlyOnceWith('system-brain', {
      pathname: '/deploy',
      raw: new URLSearchParams({
        githubRepo: 'https://github.com/example/repository',
        autoDeploy: '1'
      }).toString()
    });
    expect(mocks.cancelAutoDeployTemplate).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/signin');
    expect(mocks.setAutoLaunch.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.replace.mock.invocationCallOrder[0]
    );
  });

  it.each([undefined, '0'])('preserves manual deployment when autoDeploy is %s', (autoDeploy) => {
    delete mocks.query.autoDeploy;
    if (autoDeploy) mocks.query.autoDeploy = autoDeploy;
    OAuth();
    const destination = mocks.setAutoLaunch.mock.calls[0][1];
    expect(destination.pathname).toBe('/deploy');
    expect(new URLSearchParams(destination.raw).has('autoDeploy')).toBe(false);
    expect(new URLSearchParams(destination.raw).get('githubRepo')).toBe(mocks.query.githubRepo);
  });

  it('retains marketing attribution with the deploy destination', () => {
    mocks.query.sea_attr = 'campaign';
    OAuth();
    expect(new URLSearchParams(mocks.setAutoLaunch.mock.calls[0][1].raw).get('sea_attr')).toBe(
      'campaign'
    );
    expect(mocks.replace).toHaveBeenCalledWith('/signin?sea_attr=campaign');
  });

  it('uses the same deploy destination for an already logged-in user', async () => {
    mocks.loggedIn = true;
    OAuth();
    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/'));
    expect(mocks.setAutoLaunch.mock.calls[0][1].pathname).toBe('/deploy');
    expect(new URLSearchParams(mocks.setAutoLaunch.mock.calls[0][1].raw).get('autoDeploy')).toBe(
      '1'
    );
  });

  it('keeps ordinary app launches unchanged', () => {
    mocks.query = { openapp: 'system-brain' };
    OAuth();
    expect(mocks.setAutoLaunch).toHaveBeenCalledExactlyOnceWith('system-brain', {
      pathname: '/',
      raw: ''
    });
    expect(mocks.cancelAutoDeployTemplate).not.toHaveBeenCalled();
  });
});
