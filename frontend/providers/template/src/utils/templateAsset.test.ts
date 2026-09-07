import { describe, expect, it } from 'vitest';
import { resolveTemplateAssetUrl } from './templateAsset';

const templateFilePath = '/app/templates/template/wordpress/index.yaml';
const repoRootPath = '/app/templates';

describe('resolveTemplateAssetUrl', () => {
  it('uses the Gogs raw branch route for relative README assets', () => {
    expect(
      resolveTemplateAssetUrl({
        assetUrl: './README.md',
        repo: {
          url: 'http://gogs.example.test/sealos-admin/templates.git',
          branch: 'main',
          provider: 'gogs'
        },
        templateFilePath,
        repoRootPath
      })
    ).toBe(
      'http://gogs.example.test/sealos-admin/templates/raw/main/template/wordpress/README.md'
    );
  });

  it('keeps provider-specific raw routes for GitHub and GitLab', () => {
    const asset = {
      assetUrl: './README.md',
      templateFilePath,
      repoRootPath
    };

    expect(
      resolveTemplateAssetUrl({
        ...asset,
        repo: {
          url: 'https://github.com/labring-actions/templates.git',
          branch: 'main',
          provider: 'github'
        }
      })
    ).toBe(
      'https://raw.githubusercontent.com/labring-actions/templates/main/template/wordpress/README.md'
    );

    expect(
      resolveTemplateAssetUrl({
        ...asset,
        repo: {
          url: 'https://gitlab.com/labring-actions/templates.git',
          branch: 'main',
          provider: 'gitlab'
        }
      })
    ).toBe(
      'https://gitlab.com/labring-actions/templates/-/raw/main/template/wordpress/README.md'
    );
  });
});
