import { describe, expect, it } from 'vitest';
import { ApplicationType } from '@/types/app';
import { buildSideBarMenu, shouldResetAppType } from '@/store/config';

describe('sidebar menu', () => {
  it('builds the menu from the current managed categories', () => {
    const menu = buildSideBarMenu(
      [
        { slug: 'ai', i18n: { en: 'AI', zh: '人工智能' } },
        { slug: 'database', i18n: { en: 'Database', zh: '数据库' } }
      ],
      '',
      'zh'
    );

    expect(menu.map((item) => item.id)).toEqual(['applications', 'ai', 'database']);
    expect(menu.map((item) => item.value)).toEqual(['SideBar.Applications', '人工智能', '数据库']);
  });

  it('falls back to legacy menu keys when categories are unavailable', () => {
    const menu = buildSideBarMenu(undefined, 'ai,database', 'en');

    expect(menu.map((item) => item.id)).toEqual(['applications', 'ai', 'database']);
    expect(menu.map((item) => item.value)).toEqual([
      'SideBar.Applications',
      'SideBar.ai',
      'SideBar.database'
    ]);
  });

  it('keeps MyApp as a non-category app type', () => {
    expect(shouldResetAppType(ApplicationType.MyApp, [{ slug: 'ai', i18n: { en: 'AI' } }])).toBe(
      false
    );
    expect(shouldResetAppType('removed', [{ slug: 'ai', i18n: { en: 'AI' } }])).toBe(true);
  });
});
