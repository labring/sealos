import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTemplates } from '@/pages/api/listTemplate';
import {
  filterConfiguredCategorySlugs,
  getCategoryLabel,
  getCategorySlugs
} from '@/utils/template';
import type { TemplateCategory } from '@/types/config';
import {
  DEFAULT_TEMPLATE_CATEGORIES_REPO_PATH,
  getTemplateCatalogVersion,
  getTemplateCategories,
  getTemplateCategoriesCachePath,
  syncTemplateCategoriesFromRepo
} from '@/services/backend/template-categories';

const configuredCategories: TemplateCategory[] = [
  { slug: 'ai', i18n: { en: 'AI', zh: 'AI' } },
  { slug: 'database', i18n: { en: 'Database', zh: '数据库' } }
];

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-categories-'));
  tempDirs.push(dir);
  return dir;
}

function writeRepoCategories(repoRoot: string, categoriesContent: string) {
  const filePath = path.join(repoRoot, DEFAULT_TEMPLATE_CATEGORIES_REPO_PATH);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, categoriesContent, 'utf-8');
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TEMPLATE_CATEGORIES_PATH;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

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

  it('uses categories managed in the template repository cache', () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');
    const managedCategories: TemplateCategory[] = [
      { slug: 'tool', i18n: { en: 'Tools', zh: '工具' } }
    ];

    writeRepoCategories(repoRoot, JSON.stringify(managedCategories));

    expect(syncTemplateCategoriesFromRepo(repoRoot, appRoot)).toEqual(managedCategories);
    expect(getTemplateCategories(configuredCategories, appRoot)).toEqual(managedCategories);
  });

  it('keeps an empty repository categories list as a valid override', () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');

    writeRepoCategories(repoRoot, '[]\n');

    expect(syncTemplateCategoriesFromRepo(repoRoot, appRoot)).toEqual([]);
    expect(getTemplateCategories(configuredCategories, appRoot)).toEqual([]);
  });

  it('falls back to static categories and removes stale cache when repository categories are invalid', () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');
    const cachePath = getTemplateCategoriesCachePath(appRoot);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fs.writeFileSync(
      cachePath,
      JSON.stringify([{ slug: 'stale', i18n: { en: 'Stale' } }]),
      'utf-8'
    );
    writeRepoCategories(repoRoot, '{broken');

    expect(syncTemplateCategoriesFromRepo(repoRoot, appRoot)).toBeNull();
    expect(fs.existsSync(cachePath)).toBe(false);
    expect(getTemplateCategories(configuredCategories, appRoot)).toEqual(configuredCategories);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('falls back to static categories when repository categories are missing', () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');

    expect(syncTemplateCategoriesFromRepo(repoRoot, appRoot)).toBeNull();
    expect(getTemplateCategories(configuredCategories, appRoot)).toEqual(configuredCategories);
  });

  it('rejects repository categories that escape the repository through a symlink', () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');
    const repoCategoriesPath = path.join(repoRoot, DEFAULT_TEMPLATE_CATEGORIES_REPO_PATH);
    const outsideCategoriesPath = path.join(appRoot, 'outside-categories.json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fs.mkdirSync(path.dirname(repoCategoriesPath), { recursive: true });
    fs.writeFileSync(
      outsideCategoriesPath,
      JSON.stringify([{ slug: 'escape', i18n: { en: 'Escape' } }]),
      'utf-8'
    );
    fs.symlinkSync(outsideCategoriesPath, repoCategoriesPath);

    expect(syncTemplateCategoriesFromRepo(repoRoot, appRoot)).toBeNull();
    expect(getTemplateCategories(configuredCategories, appRoot)).toEqual(configuredCategories);
    expect(getTemplateCatalogVersion(appRoot)).toContain('missing');
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});
