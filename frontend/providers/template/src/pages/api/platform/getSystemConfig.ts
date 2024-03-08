import { jsonRes } from '@/services/backend/response';
import { SystemConfigType } from '@/types/app';
import { readFileSync } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getSystemConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

export const defaultConfig: SystemConfigType = {
  showCarousel: true,
  slideData: [
    {
      image:
        'https://images.unsplash.com/photo-1546768292-fb12f6c92568?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      bg: 'linear-gradient(274deg, #824DFF 13.19%, #A97CFF 93.1%)',
      title: 'Laf',
      desc: 'Laf 是开源的云开发平台，提供云函数、云数据库、云存储等开箱即用的应用资源。让开发者专注于业务开发，无需折腾服务器，快速释放创意。',
      borderRadius: '8px',
      icon: 'https://laf.run/homepage/logo_icon.svg',
      templateName: 'laf'
    },
    {
      image:
        'https://images.unsplash.com/photo-1501446529957-6226bd447c46?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=1489&q=80',
      bg: 'linear-gradient(274deg, #3770FE 6.31%, #6793FF 93.69%)',
      title: 'Umami',
      desc: 'Umami is an open source, privacy-focused alternative to Google Analytics.',
      borderRadius: '8px',
      icon: 'https://jsd.onmicrosoft.cn/gh/umami-software/umami@master/src/assets/logo.svg',
      templateName: 'umami'
    },
    {
      image:
        'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=1350&q=80',
      bg: '#824DFF',
      title: 'Lobe Chat',
      desc: 'LobeChat 是开源的高性能聊天机器人框架，支持语音合成、多模态、可扩展的（Function Call）插件系统。支持一键免费部署私人 ChatGPT/LLM 网页应用程序。',
      borderRadius: '8px',
      icon: 'https://jsd.onmicrosoft.cn/npm/@lobehub/assets-logo@1.0.0/assets/logo-3d.webp',
      templateName: 'lobe-chat'
    },
    {
      image:
        'https://images.unsplash.com/photo-1475189778702-5ec9941484ae?ixlib=rb-1.2.1&ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&auto=format&fit=crop&w=1351&q=80',
      bg: '#3770FE',
      title: 'FastGPT',
      desc: "Improving AI's Ability To Grasp Your Knowledge",
      borderRadius: '8px',
      icon: 'https://jsd.onmicrosoft.cn/gh/labring/FastGPT@main/.github/imgs/logo.svg',
      templateName: 'fastgpt'
    }
  ]
};

export async function getSystemConfig(): Promise<SystemConfigType> {
  try {
    if (process.env.NODE_ENV === 'development') return defaultConfig;
    const filename = '/app/data/config.json';
    const res = JSON.parse(readFileSync(filename, 'utf-8')) as SystemConfigType;
    return res;
  } catch (error) {
    console.log('-getSystemConfig-\n', error);
    return defaultConfig;
  }
}
