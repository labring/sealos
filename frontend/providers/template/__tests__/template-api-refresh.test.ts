import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TemplateCategory } from '@/types/config';
import {
  getTemplateCategoriesCachePath,
  syncTemplateCategoriesFromRepo
} from '@/services/backend/template-categories';

const { refreshRepo } = vi.hoisted(() => ({
  refreshRepo: vi.fn()
}));

vi.mock('@/services/backend/template-repo', () => ({
  ensureTemplateRepoFresh: refreshRepo
}));

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-api-refresh-'));
  tempDirs.push(dir);
  return dir;
}

function writeCategories(repoRoot: string, categories: TemplateCategory[]) {
  const categoriesPath = path.join(repoRoot, 'config/categories.json');
  fs.mkdirSync(path.dirname(categoriesPath), { recursive: true });
  fs.writeFileSync(categoriesPath, JSON.stringify(categories), 'utf8');
}

function writeTemplateCatalog(appRoot: string) {
  fs.writeFileSync(
    path.join(appRoot, 'templates.json'),
    JSON.stringify([
      {
        apiVersion: 'app.sealos.io/v1',
        kind: 'Template',
        metadata: { name: 'database-template' },
        spec: {
          categories: ['database'],
          templateType: 'inline',
          title: 'Database',
          readme: '',
          icon: '',
          description: '',
          draft: false
        }
      }
    ]),
    'utf8'
  );
}

afterEach(() => {
  process.chdir(originalCwd);
  refreshRepo.mockReset();
  delete process.env.TEMPLATE_CATEGORIES;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('template category refresh ordering', () => {
  it('uses refreshed categories in the same v1 list request', async () => {
    const appRoot = createTempDir();
    const repoRoot = path.join(appRoot, 'templates');
    const fallbackCategories: TemplateCategory[] = [{ slug: 'ai', i18n: { en: 'AI', zh: 'AI' } }];
    const refreshedCategories: TemplateCategory[] = [
      { slug: 'database', i18n: { en: 'Database', zh: '数据库' } }
    ];

    fs.mkdirSync(repoRoot, { recursive: true });
    writeCategories(repoRoot, fallbackCategories);
    syncTemplateCategoriesFromRepo(repoRoot, appRoot);
    writeCategories(repoRoot, refreshedCategories);
    writeTemplateCatalog(appRoot);
    process.chdir(appRoot);
    process.env.TEMPLATE_CATEGORIES = JSON.stringify(fallbackCategories);
    refreshRepo.mockImplementation(async (basePath: string) => {
      syncTemplateCategoriesFromRepo(repoRoot, basePath);
    });

    const { default: handler } = await import('@/pages/api/v1/template/index');
    const response = { json: vi.fn() } as any;

    await handler({ query: { language: 'en' } } as any, response);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({
          menuKeys: 'database',
          templates: [expect.objectContaining({ category: ['database'] })]
        })
      })
    );
    expect(fs.existsSync(getTemplateCategoriesCachePath(appRoot))).toBe(true);
  });
});
