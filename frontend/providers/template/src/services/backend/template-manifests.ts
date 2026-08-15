import fs from 'fs';
import path from 'path';

const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);

function isWithinDirectory(rootPath: string, candidatePath: string, allowSamePath = false) {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    (allowSamePath && relativePath.length === 0) ||
    (relativePath.length > 0 && !relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

function readYamlFiles(targetPath: string, rootPath: string, fileList: string[]) {
  for (const item of fs.readdirSync(targetPath).sort()) {
    const filePath = path.join(targetPath, item);
    let realFilePath: string;
    try {
      realFilePath = fs.realpathSync(filePath);
    } catch (error) {
      continue;
    }

    if (!isWithinDirectory(rootPath, realFilePath)) continue;

    const stats = fs.statSync(realFilePath);

    if (stats.isDirectory()) {
      readYamlFiles(realFilePath, rootPath, fileList);
      continue;
    }

    if (stats.isFile() && YAML_EXTENSIONS.has(path.extname(item).toLowerCase())) {
      fileList.push(realFilePath);
    }
  }
}

export function getTemplateManifestFiles(templateFilePath: string, repoRootPath?: string) {
  const manifestsPath = path.join(path.dirname(templateFilePath), 'manifests');
  if (!fs.existsSync(manifestsPath) || !fs.statSync(manifestsPath).isDirectory()) {
    return [];
  }

  const repositoryRoot = fs.realpathSync(repoRootPath || path.dirname(templateFilePath));
  const templateDirectory = fs.realpathSync(path.dirname(templateFilePath));
  if (!isWithinDirectory(repositoryRoot, templateDirectory, true)) return [];

  const realManifestsPath = fs.realpathSync(manifestsPath);
  if (!isWithinDirectory(templateDirectory, realManifestsPath)) return [];

  const fileList: string[] = [];
  readYamlFiles(realManifestsPath, templateDirectory, fileList);
  return fileList;
}

export function appendTemplateManifestSources(
  appYaml: string,
  templateFilePath: string,
  repoRootPath?: string
) {
  const manifestSources = getTemplateManifestFiles(templateFilePath, repoRootPath).map((filePath) =>
    fs.readFileSync(filePath, 'utf-8')
  );

  return [appYaml, ...manifestSources].filter((source) => source.trim()).join('\n---\n');
}
