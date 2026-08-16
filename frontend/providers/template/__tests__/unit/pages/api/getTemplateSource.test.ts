import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { GetTemplateByName } from '@/pages/api/getTemplateSource';

const originalWorkingDirectory = process.cwd();
const originalTemplateRepoEnv = {
  url: process.env.TEMPLATE_REPO_URL,
  branch: process.env.TEMPLATE_REPO_BRANCH,
  provider: process.env.TEMPLATE_REPO_PROVIDER
};
const temporaryDirectories: string[] = [];

afterEach(() => {
  process.chdir(originalWorkingDirectory);
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true }));
  if (originalTemplateRepoEnv.url === undefined) delete process.env.TEMPLATE_REPO_URL;
  else process.env.TEMPLATE_REPO_URL = originalTemplateRepoEnv.url;
  if (originalTemplateRepoEnv.branch === undefined) delete process.env.TEMPLATE_REPO_BRANCH;
  else process.env.TEMPLATE_REPO_BRANCH = originalTemplateRepoEnv.branch;
  if (originalTemplateRepoEnv.provider === undefined) delete process.env.TEMPLATE_REPO_PROVIDER;
  else process.env.TEMPLATE_REPO_PROVIDER = originalTemplateRepoEnv.provider;
});

describe('GetTemplateByName', () => {
  it('loads separated manifests and persists a browser-compatible instance icon', async () => {
    const workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-source-'));
    temporaryDirectories.push(workingDirectory);
    const templateRoot = path.join(workingDirectory, 'templates');
    const templateDirectory = path.join(templateRoot, 'ace-step');
    const manifestsDirectory = path.join(templateDirectory, 'manifests');
    fs.mkdirSync(manifestsDirectory, { recursive: true });

    const iconUrl =
      'https://gogs.192.168.0.62.nip.io/sealos-admin/templates/raw/main/template/ace-step/logo.svg';
    const indexPath = path.join(templateDirectory, 'index.yaml');
    fs.writeFileSync(
      indexPath,
      [
        'apiVersion: app.sealos.io/v1',
        'kind: Template',
        'metadata:',
        '  name: ace-step',
        'spec:',
        '  title: Ace Step',
        `  icon: ${iconUrl}`,
        '  defaults:',
        '    app_name:',
        '      type: string',
        '      value: ace-step',
        ''
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(manifestsDirectory, '001-app.yaml'),
      'apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: ace-step\n'
    );
    fs.writeFileSync(
      path.join(workingDirectory, 'templates.json'),
      JSON.stringify([
        {
          apiVersion: 'app.sealos.io/v1',
          kind: 'Template',
          metadata: { name: 'ace-step' },
          spec: {
            fileName: 'index.yaml',
            filePath: indexPath,
            deployCount: 1
          }
        }
      ])
    );

    process.env.TEMPLATE_REPO_URL = 'https://gogs.192.168.0.62.nip.io/sealos-admin/templates';
    process.env.TEMPLATE_REPO_BRANCH = 'main';
    process.env.TEMPLATE_REPO_PROVIDER = 'gogs';
    process.chdir(workingDirectory);

    const result = await GetTemplateByName({
      namespace: 'ns-admin',
      templateName: 'ace-step'
    });

    expect(result.code).toBe(20000);
    expect(result.appYaml).toContain('kind: StatefulSet');
    expect(result.appYaml).toContain('/api/templateAsset?path=template%2Face-step%2Flogo.svg');
    expect(result.templateYaml?.spec.icon).toBe(
      '/api/templateAsset?path=template%2Face-step%2Flogo.svg'
    );
  });
});
