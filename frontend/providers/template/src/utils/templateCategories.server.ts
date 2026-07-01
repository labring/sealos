import fs from 'fs';
import path from 'path';
import { parseTemplateCategories } from './template';

function resolveRepoCategoryPath(repoRootPath: string) {
  const configuredPath = process.env.TEMPLATE_CATEGORIES_PATH || 'config/categories.json';
  const rootPath = path.resolve(repoRootPath);
  const categoryPath = path.resolve(rootPath, configuredPath);

  if (categoryPath !== rootPath && !categoryPath.startsWith(`${rootPath}${path.sep}`)) {
    return '';
  }

  return categoryPath;
}

export function getConfiguredTemplateCategories(
  repoRootPath = path.resolve(process.cwd(), 'templates')
) {
  const categoryPath = resolveRepoCategoryPath(repoRootPath);

  if (categoryPath && fs.existsSync(categoryPath)) {
    try {
      return parseTemplateCategories(fs.readFileSync(categoryPath, 'utf8'));
    } catch (error) {
      console.error('[Template Categories] Failed to read categories from repository:', error);
    }
  }

  return parseTemplateCategories(process.env.TEMPLATE_CATEGORIES);
}
