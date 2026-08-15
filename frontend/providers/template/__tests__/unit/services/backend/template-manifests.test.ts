import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendTemplateManifestSources,
  getTemplateManifestFiles
} from '@/services/backend/template-manifests';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true }));
});

describe('template manifest sources', () => {
  it('appends nested manifests next to the template index in stable order', () => {
    const templateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-manifests-'));
    temporaryDirectories.push(templateDirectory);
    const manifestsDirectory = path.join(templateDirectory, 'manifests', 'nested');
    fs.mkdirSync(manifestsDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(templateDirectory, 'manifests', '002-service.yaml'),
      'kind: Service\n'
    );
    fs.writeFileSync(path.join(manifestsDirectory, '001-deployment.yaml'), 'kind: Deployment\n');

    const templateFilePath = path.join(templateDirectory, 'index.yaml');
    const realManifestsDirectory = fs.realpathSync(path.join(templateDirectory, 'manifests'));
    expect(getTemplateManifestFiles(templateFilePath)).toEqual([
      path.join(realManifestsDirectory, '002-service.yaml'),
      path.join(realManifestsDirectory, 'nested', '001-deployment.yaml')
    ]);

    expect(appendTemplateManifestSources('kind: Instance\n', templateFilePath)).toBe(
      'kind: Instance\n\n---\nkind: Service\n\n---\nkind: Deployment\n'
    );
  });

  it('keeps a template without manifests unchanged', () => {
    const templateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-manifests-'));
    temporaryDirectories.push(templateDirectory);

    expect(
      appendTemplateManifestSources('kind: Instance\n', path.join(templateDirectory, 'index.yaml'))
    ).toBe('kind: Instance\n');
  });

  it('does not follow manifests symlinks outside the template directory', () => {
    const templateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-manifests-'));
    const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-manifests-outside-'));
    temporaryDirectories.push(templateDirectory, outsideDirectory);
    fs.mkdirSync(path.join(templateDirectory, 'manifests'));
    fs.writeFileSync(path.join(outsideDirectory, 'secret.yaml'), 'kind: Secret\n');
    fs.symlinkSync(outsideDirectory, path.join(templateDirectory, 'manifests', 'external'));

    expect(getTemplateManifestFiles(path.join(templateDirectory, 'index.yaml'))).toEqual([]);
  });

  it('does not read a template directory outside the repository root', () => {
    const repositoryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-repository-'));
    const templateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'template-outside-'));
    temporaryDirectories.push(repositoryDirectory, templateDirectory);
    fs.mkdirSync(path.join(templateDirectory, 'manifests'));
    fs.writeFileSync(
      path.join(templateDirectory, 'manifests', '001-app.yaml'),
      'kind: Deployment\n'
    );

    expect(
      getTemplateManifestFiles(path.join(templateDirectory, 'index.yaml'), repositoryDirectory)
    ).toEqual([]);
  });
});
