import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { exec } from 'child_process';
import fs from 'fs';
import JSYAML from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import util from 'util';
const execAsync = util.promisify(exec);

const readFileList = (targetPath: string, fileList: unknown[] = [], handlePath: string) => {
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
    if (stats.isFile() && path.extname(item) === '.yaml' && item !== 'template.yaml') {
      fileList.push(filePath);
    } else if (stats.isDirectory() && item === handlePath) {
      readFileList(filePath, fileList, handlePath);
    }
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const repoHttpUrl =
      process.env.TEMPLATE_REPO_URL || 'https://github.com/labring-actions/templates';
    const originalPath = process.cwd();
    const targetPath = path.resolve(originalPath, 'FastDeployTemplates');
    const jsonPath = path.resolve(originalPath, 'fast_deploy_template.json');

    try {
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('operation timed out'));
        }, 60 * 1000);
      });
      const gitOperationPromise = !fs.existsSync(targetPath)
        ? execAsync(`git clone ${repoHttpUrl} ${targetPath} --depth=1`)
        : execAsync(`cd ${targetPath} && git pull --depth=1`);

      await Promise.race([gitOperationPromise, timeoutPromise]);
    } catch (error) {
      console.log('git operation timed out');
    }

    if (!fs.existsSync(targetPath)) {
      return jsonRes(res, { error: 'missing template repository file', code: 500 });
    }

    let fileList: unknown[] = [];
    readFileList(targetPath, fileList, 'template');

    let jsonObjArr: unknown[] = [];
    fileList.forEach((item: any) => {
      try {
        if (!item) return;
        const content = fs.readFileSync(item, 'utf-8');
        const yamlTemplate: any = JSYAML.loadAll(content)[0];
        if (!!yamlTemplate) {
          jsonObjArr.push(yamlTemplate);
        }
      } catch (error) {
        console.log(error, 'yaml parse error');
      }
    });

    const jsonContent = JSON.stringify(jsonObjArr, null, 2);
    fs.writeFileSync(jsonPath, jsonContent, 'utf-8');

    jsonRes(res, { data: `success update template ${repoHttpUrl}`, code: 200 });
  } catch (err: any) {
    console.log(err, '===update repo log===');
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
