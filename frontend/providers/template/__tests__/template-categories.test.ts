import fs from 'fs';
import JsYaml from 'js-yaml';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTemplates } from '@/pages/api/listTemplate';
import {
  clearTemplateCache,
  getCachedTemplates
} from '@/pages/api/v2alpha/templates/templateCache';
import { GetTemplateByName } from '@/pages/api/getTemplateSource';
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
  clearTemplateCache();
  delete globalThis.__APP_CONFIG__;
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

  it('does not reuse v2 template cache across category sets or languages', () => {
    const appRoot = createTempDir();
    const jsonPath = path.join(appRoot, 'templates.json');
    const jsonData = JSON.stringify([
      {
        apiVersion: 'app.sealos.io/v1',
        kind: 'Template',
        metadata: { name: 'english' },
        spec: {
          fileName: 'english.yaml',
          filePath: 'english.yaml',
          locale: 'en',
          categories: ['ai', 'database'],
          templateType: 'inline',
          gitRepo: '',
          author: '',
          title: 'English',
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
        metadata: { name: 'chinese' },
        spec: {
          fileName: 'chinese.yaml',
          filePath: 'chinese.yaml',
          locale: 'zh',
          categories: ['database'],
          templateType: 'inline',
          gitRepo: '',
          author: '',
          title: 'Chinese',
          url: '',
          readme: '',
          icon: '',
          description: '',
          draft: false
        }
      }
    ]);

    fs.writeFileSync(jsonPath, jsonData, 'utf-8');

    const aiOnly = getCachedTemplates(jsonPath, undefined, [configuredCategories[0]], 'en');
    const databaseOnly = getCachedTemplates(jsonPath, undefined, [configuredCategories[1]], 'en');
    const zhOnly = getCachedTemplates(jsonPath, undefined, configuredCategories, 'zh');

    expect(aiOnly.data.map((template) => template.metadata.name)).toEqual(['english']);
    expect(aiOnly.data[0].spec.categories).toEqual(['ai']);
    expect(databaseOnly.data[0].spec.categories).toEqual(['database']);
    expect(zhOnly.data.map((template) => template.metadata.name)).toEqual(['chinese']);
  });

  it('removes stale category cache when publishing the managed cache fails', () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');
    const cachePath = getTemplateCategoriesCachePath(appRoot);

    fs.writeFileSync(
      cachePath,
      JSON.stringify([{ slug: 'stale', i18n: { en: 'Stale' } }]),
      'utf-8'
    );
    writeRepoCategories(repoRoot, JSON.stringify(configuredCategories));

    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('rename failed');
    });

    expect(() => syncTemplateCategoriesFromRepo(repoRoot, appRoot)).toThrow('rename failed');
    expect(fs.existsSync(cachePath)).toBe(false);
    expect(renameSpy).toHaveBeenCalledOnce();
  });

  it('filters managed categories from template source and generated instance yaml', async () => {
    const appRoot = createTempDir();
    const previousCwd = process.cwd();
    const repoRoot = path.join(appRoot, 'templates');
    const templateFilePath = path.join(repoRoot, 'demo.yaml');

    fs.mkdirSync(repoRoot, { recursive: true });
    fs.writeFileSync(
      path.join(appRoot, 'templates.json'),
      JSON.stringify([
        {
          apiVersion: 'app.sealos.io/v1',
          kind: 'Template',
          metadata: { name: 'demo' },
          spec: {
            fileName: 'demo.yaml',
            filePath: templateFilePath,
            categories: ['ai', 'removed'],
            templateType: 'inline',
            gitRepo: '',
            author: '',
            title: 'Demo',
            url: '',
            readme: '',
            icon: '',
            description: '',
            draft: false
          }
        }
      ]),
      'utf-8'
    );
    fs.writeFileSync(
      templateFilePath,
      `apiVersion: app.sealos.io/v1
kind: Template
metadata:
  name: demo
spec:
  categories:
    - ai
    - removed
  defaults:
    app_name:
      type: string
      value: demo-app
  inputs: {}
---
apiVersion: v1
kind: Service
metadata:
  name: demo-app
`,
      'utf-8'
    );

    globalThis.__APP_CONFIG__ = {
      cloud: {
        domain: 'cloud.example.com',
        port: 443,
        regionUid: 'test',
        certSecretName: 'cert'
      },
      template: {
        ui: {
          brandName: 'Template',
          currencySymbol: 'shellCoin',
          forcedLanguage: 'en',
          meta: { canonicalUrl: 'https://template.example.com', customScripts: [] },
          carousel: { enabled: false, slides: [] }
        },
        repo: {
          url: 'https://github.com/labring-actions/templates',
          branch: 'main',
          localDir: '.'
        },
        features: { fetchReadme: false, showAuthor: true, guide: false },
        categories: [configuredCategories[0]],
        desktopDomain: 'desktop.example.com',
        billingUrl: 'https://billing.example.com'
      }
    };
    process.chdir(appRoot);

    try {
      const result = await GetTemplateByName({
        namespace: 'ns-test',
        templateName: 'demo',
        includeReadme: 'false'
      });
      const instanceYaml = JsYaml.load(String(result.appYaml).split('---')[0]) as any;

      expect(result.code).toBe(20000);
      expect(result.templateYaml?.spec.categories).toEqual(['ai']);
      expect(instanceYaml.spec.categories).toEqual(['ai']);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
