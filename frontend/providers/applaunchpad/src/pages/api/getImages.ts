import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

const BASE_URL = process.env.IMAGE_REPO_URL;
const USERNAME = process.env.IMAGE_REPO_USERNAME;
const PASSWORD = process.env.IMAGE_REPO_PASSWORD;

const authHeader = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

export async function fetchCatalog() {
  const response = await fetch(`${BASE_URL}/_catalog`, {
    headers: {
      Authorization: authHeader
    }
  });
  return response.json();
}

export async function fetchTags(repository: string) {
  const response = await fetch(`${BASE_URL}/${repository}/tags/list`, {
    headers: {
      Authorization: authHeader
    }
  });
  return response.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { repository } = req.query as {
      repository?: string;
    };

    const { k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const catalog = await fetchCatalog();

    if (repository) {
      const tags = await fetchTags(repository);
      return jsonRes(res, {
        data: tags
      });
    }

    jsonRes(res, {
      data: catalog
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
