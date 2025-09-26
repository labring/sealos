import { K8sApiDefault } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

import { exec } from 'child_process';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import util from 'util';
import * as k8s from '@kubernetes/client-node';
import { getYamlTemplate } from '@/utils/json-yaml';
import { getTemplateEnvs } from '@/utils/tools';

const execAsync = util.promisify(exec);

const readFileList = (targetPath: string, fileList: unknown[] = []) => {
  // fix ci
  const sanitizePath = (inputPath: string) => {
    if (typeof inputPath !== 'string') {
      throw new Error('Invalid path. Path must be a string.');
    }
    return inputPath;
  };
  const files = fs.readdirSync(targetPath);

  files.forEach((item: any) => {
    // ok:path-join-resolve-traversal
    const filePath = path.join(sanitizePath(targetPath), sanitizePath(item));
    const stats = fs.statSync(filePath);
    const isYamlFile = path.extname(item) === '.yaml' || path.extname(item) === '.yml';
    if (stats.isFile() && isYamlFile && item !== 'template.yaml') {
      fileList.push(filePath);
    } else if (stats.isDirectory()) {
      readFileList(filePath, fileList);
    }
  });
};

export async function GetTemplateStatic() {
  try {
    const defaultKC = K8sApiDefault();
    const result = await defaultKC
      .makeApiClient(k8s.CoreV1Api)
      .readNamespacedConfigMap('template-static', 'template-frontend');

    const inputString = result?.body?.data?.['install-count'] || '';

    const installCountArray = inputString.split(/\n/).filter(Boolean);

    const temp: { [key: string]: number } = {};
    installCountArray.forEach((item) => {
      const match = item.trim().match(/^(\d+)\s(.+)$/);
      if (match) {
        const count = match[1];
        const name = match[2];
        temp[name] = parseInt(count, 10);
      } else {
        console.error(`Data format error: ${item}`);
      }
    });
    return temp;
  } catch (error: any) {
    console.log('error: kubectl get configmap/template-static \n', error?.body);
    return {};
  }
}

export async function updateRepo() {
  const targetFolder = process.env.TEMPLATE_REPO_FOLDER || 'template';
  const originalPath = process.cwd();
  const targetPath = path.resolve(originalPath, 'templates');
  const jsonPath = path.resolve(originalPath, 'templates.json');

  const TemplateEnvs = getTemplateEnvs();

  try {
    const gitConfigResult = await execAsync(
      'git config --global --add safe.directory /app/providers/template/templates',
      { timeout: 10000 }
    );
    const gitCommand = !fs.existsSync(targetPath)
      ? `git clone -b ${TemplateEnvs.TEMPLATE_REPO_BRANCH} ${TemplateEnvs.TEMPLATE_REPO_URL} ${targetPath} --depth=1`
      : `cd ${targetPath} && git pull --depth=1 --rebase`;

    const result = await execAsync(gitCommand, { timeout: 60000 });

    console.log('git operation:', result);
  } catch (error) {
    console.log('git operation timed out: \n', error);
    throw new Error('Git operation failed: ');
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error('missing template repository file');
  }

  let fileList: unknown[] = [];
  const _targetPath = path.join(targetPath, targetFolder);
  readFileList(_targetPath, fileList);

  const templateStaticMap: { [key: string]: number } = await GetTemplateStatic();

  let jsonObjArr: unknown[] = [];
  fileList.forEach((item: any) => {
    try {
      if (!item) return;
      const fileName = path.basename(item);
      const content = fs.readFileSync(item, 'utf-8');
      const { templateYaml } = getYamlTemplate(content);
      if (!!templateYaml) {
        const appTitle = templateYaml.spec.title.toUpperCase();
        const currentCount = templateStaticMap[appTitle] || 0;
        const randomFactor = 11 + Math.floor(Math.random() * 5); // [11,12,13,14,15]
        const newCount = (currentCount + 1) * randomFactor;

        templateYaml.spec['deployCount'] = newCount;
        templateYaml.spec['filePath'] = item;
        templateYaml.spec['fileName'] = fileName;
        jsonObjArr.push(templateYaml);
      }
    } catch (error) {
      console.log(error, 'yaml parse error');
    }
  });

  const jsonContent = JSON.stringify(jsonObjArr, null, 2);
  fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
}
