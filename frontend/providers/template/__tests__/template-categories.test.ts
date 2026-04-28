import { describe, expect, it } from 'vitest';
import { readTemplates } from '@/pages/api/listTemplate';
import {
  filterConfiguredCategorySlugs,
  getCategoryLabel,
  getCategorySlugs
} from '@/utils/template';
import type { TemplateCategory } from '@/types/config';

const configuredCategories: TemplateCategory[] = [
  { slug: 'ai', i18n: { en: 'AI', zh: 'AI' } },
  { slug: 'database', i18n: { en: 'Database', zh: '数据库' } }
];

describe('template category configuration', () => {
  it('derives sidebar slugs and labels from app-defined categories', () => {
    expect(getCategorySlugs(configuredCategories)).toEqual(['ai', 'database']);
    expect(getCategoryLabel(configuredCategories[1], 'zh')).toBe('数据库');
    expect(getCategoryLabel(configuredCategories[1], 'fr')).toBe('Database');
  });

  it('keeps only repository categories defined by the app config', () => {
    expect(
      filterConfiguredCategorySlugs(['unknown', 'database', 'ai'], configuredCategories)
    ).toEqual(['database', 'ai']);
  });

  it('sanitizes template repository categories while reading templates', () => {
    const jsonData = JSON.stringify([
      {
        apiVersion: 'app.sealos.io/v1',
        kind: 'Template',
        metadata: { name: 'visible' },
        spec: {
          fileName: 'visible.yaml',
          filePath: 'visible.yaml',
          categories: ['unknown', 'ai'],
          templateType: 'inline',
          gitRepo: '',
          author: '',
          title: 'Visible',
          url: '',
          readme: '',
          icon: '',
          description: '',
          draft: false
        }
      },
      {
        apiVersion: 'app.sealos.io/v1',
        kind: 'Template',
        metadata: { name: 'draft' },
        spec: {
          fileName: 'draft.yaml',
          filePath: 'draft.yaml',
          categories: ['database'],
          templateType: 'inline',
          gitRepo: '',
          author: '',
          title: 'Draft',
          url: '',
          readme: '',
          icon: '',
          description: '',
          draft: true
        }
      }
    ]);

    const templates = readTemplates(jsonData, undefined, configuredCategories, 'en');

    expect(templates).toHaveLength(1);
    expect(templates[0].metadata.name).toBe('visible');
    expect(templates[0].spec.categories).toEqual(['ai']);
  });
});
