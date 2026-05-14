import { describe, expect, it } from 'vitest';
import { replaceRawWithCDN } from '@/pages/api/listTemplate';
import { resolveTemplateAssetUrl, resolveTemplateAssetUrls } from '@/utils/templateAsset';
import type { TemplateType } from '@/types/app';

const repo = {
  url: 'https://github.com/labring-actions/templates',
  branch: 'main'
};

const repoRootPath = '/app/providers/template/templates';

function createTemplate(overrides: Partial<TemplateType['spec']> = {}): TemplateType {
  return {
    apiVersion: 'app.sealos.io/v1',
    kind: 'Template',
    metadata: { name: 'visible' },
    spec: {
      fileName: 'index.yaml',
      filePath: `${repoRootPath}/template/appsmith/index.yaml`,
      categories: ['low-code'],
      templateType: 'inline',
      gitRepo: 'https://github.com/appsmithorg/appsmith',
      author: '',
      title: 'Visible',
      url: '',
      readme: './README.md',
      icon: './static/logo.png',
      description: '',
      draft: false,
      ...overrides
    }
  };
}

describe('template asset URL resolution', () => {
  it('resolves GitHub template asset URLs relative to the template yaml directory', () => {
    expect(
      resolveTemplateAssetUrl({
        assetUrl: './README.md',
        repo,
        templateFilePath: `${repoRootPath}/template/appsmith/index.yaml`,
        repoRootPath
      })
    ).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/appsmith/README.md'
    );
  });

  it('resolves icon URLs for templates stored as a yaml file in a directory', () => {
    expect(
      resolveTemplateAssetUrl({
        assetUrl: './static/logo.png',
        repo,
        templateFilePath: `${repoRootPath}/template/appsmith.yaml`,
        repoRootPath
      })
    ).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/static/logo.png'
    );
  });

  it('keeps absolute URLs unchanged', () => {
    expect(
      resolveTemplateAssetUrl({
        assetUrl: 'https://example.com/logo.png',
        repo,
        templateFilePath: `${repoRootPath}/template/appsmith/index.yaml`,
        repoRootPath
      })
    ).toBe('https://example.com/logo.png');
  });

  it('resolves i18n readme and icon URLs', () => {
    const template = resolveTemplateAssetUrls(
      createTemplate({
        i18n: {
          en: {
            readme: './README_en.md',
            icon: './images/logo-en.png',
            description: 'English'
          }
        }
      }),
      {
        repo,
        templateFilePath: `${repoRootPath}/template/appsmith/index.yaml`,
        repoRootPath
      }
    );

    expect(template.spec.readme).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/appsmith/README.md'
    );
    expect(template.spec.icon).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/appsmith/static/logo.png'
    );
    expect(template.spec.i18n?.en.readme).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/appsmith/README_en.md'
    );
    expect(template.spec.i18n?.en.icon).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/appsmith/images/logo-en.png'
    );
  });

  it('keeps GitHub CDN replacement for resolved raw URLs', () => {
    const rawUrl = resolveTemplateAssetUrl({
      assetUrl: './README.md',
      repo,
      templateFilePath: `${repoRootPath}/template/appsmith/index.yaml`,
      repoRootPath
    });

    expect(replaceRawWithCDN(rawUrl, 'cdn.jsdelivr.net')).toBe(
      'https://cdn.jsdelivr.net/gh/labring-actions/templates@main/template/appsmith/README.md'
    );
  });
});
