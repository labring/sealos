import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { exec } from 'child_process';
import fs from 'fs';
import JSYAML from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

const readFileList = (targetPath: string, fileList: unknown[] = [], handlePath: string) => {
  const files = fs.readdirSync(targetPath);
  files.forEach((item: any) => {
    const filePath = path.join(targetPath, item);
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
    const handlePath = process.env.TEMPLATE_REPO_PATH || 'template';

    if (!fs.existsSync(targetPath)) {
      exec(`git clone ${repoHttpUrl} ${targetPath}`, (error, stdout, stderr) => {
        console.log(error, stdout);
      });
    } else {
      exec(`cd ${targetPath} && git pull`, (error, stdout, stderr) => {
        console.log(error, stdout);
      });
    }

    if (!fs.existsSync(targetPath)) {
      return jsonRes(res, { error: 'template repo err', code: 500 });
    }

    let fileList: unknown[] = [];
    readFileList(targetPath, fileList, handlePath);

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
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
