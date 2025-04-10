'use server';

import { useSyncExternalStore } from 'react';

const fs = require('fs');
import * as yaml from 'js-yaml';

export function readConfig() {
  const filename =
    process.env.NODE_ENV === 'development'
      ? 'data/config.yaml.local' // 开发环境配置
      : '/app/data/config.yaml'; // 生产环境配置（通过 volume 挂载）

  console.log(filename, 'filename');

  const yamlContent = fs.readFileSync(filename, 'utf-8');
  console.log(yamlContent, 'yamlContent');
  const config = yaml.load(yamlContent) as Record<string, any>;

  return config;
}

export const config = readConfig();
