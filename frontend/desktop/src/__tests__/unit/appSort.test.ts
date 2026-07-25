import { compareSystemAppOrder } from '@/utils/appSort';
import { APPTYPE, TAppConfig } from '@/types';

const createApp = (overrides: Partial<TAppConfig> & Pick<TAppConfig, 'key'>): TAppConfig => ({
  name: overrides.key,
  icon: '/logo.svg',
  type: APPTYPE.IFRAME,
  data: {
    url: '',
    desc: ''
  },
  representativeMeta: {
    forcedIconStyle: 'fill'
  },
  displayType: 'normal',
  ...overrides
});

describe('compareSystemAppOrder', () => {
  it('sorts by display type, position, creation time, then key', () => {
    const apps = [
      createApp({
        key: 'system-hidden',
        displayType: 'hidden',
        position: 0,
        creationTimestamp: '2026-06-04T00:00:00Z'
      }),
      createApp({
        key: 'system-more',
        displayType: 'more',
        position: 0,
        creationTimestamp: '2026-06-01T00:00:00Z'
      }),
      createApp({
        key: 'system-later',
        position: 20,
        creationTimestamp: '2026-06-03T00:00:00Z'
      }),
      createApp({
        key: 'system-first',
        position: 10,
        creationTimestamp: '2026-06-02T00:00:00Z'
      })
    ].sort(compareSystemAppOrder);

    expect(apps.map((app) => app.key)).toEqual([
      'system-first',
      'system-later',
      'system-more',
      'system-hidden'
    ]);
  });

  it('treats missing position as zero', () => {
    const apps = [
      createApp({
        key: 'system-positioned',
        position: 1
      }),
      createApp({
        key: 'system-default'
      })
    ].sort(compareSystemAppOrder);

    expect(apps.map((app) => app.key)).toEqual(['system-default', 'system-positioned']);
  });
});
