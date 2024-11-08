import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

interface Config {
  baseUrl: string;
  username: string;
  password: string;
}

export interface TagDetail {
  name: string;
  size?: number;
  created?: string;
}

interface ManifestLayer {
  size: number;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ImageRegistryClient {
  private authHeader: string;

  constructor(private config: Config) {
    this.authHeader =
      'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: this.authHeader,
          ...options.headers
        }
      });

      if (response.status === 404) {
        console.warn(`Resource not found: ${path}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      return null;
    }
  }

  async getRepositories(): Promise<string[]> {
    const result = await this.fetch<{ repositories: string[] }>('/_catalog');
    return result?.repositories || [];
  }

  async getTagsList(repository: string): Promise<string[]> {
    const result = await this.fetch<{ tags: string[] }>(`/${repository}/tags/list`);
    return result?.tags || [];
  }

  async getManifest(repository: string, tag: string) {
    return this.fetch(`/${repository}/manifests/${tag}`, {
      headers: {
        Accept: 'application/vnd.docker.distribution.manifest.v2+json'
      }
    });
  }

  async getConfig(repository: string, digest: string) {
    return this.fetch(`/${repository}/blobs/${digest}`);
  }

  async getTagDetails(repository: string, tag: string): Promise<TagDetail | null> {
    try {
      const manifest: any = await this.getManifest(repository, tag);
      if (!manifest) return null;

      const config: any = await this.getConfig(repository, manifest.config.digest);
      if (!config) return null;

      const totalSize = manifest.layers.reduce(
        (sum: number, layer: ManifestLayer) => sum + layer.size,
        0
      );

      return {
        name: tag,
        size: totalSize,
        created: config.created
      };
    } catch (error) {
      console.error(`Error getting tag details for ${repository}:${tag}:`, error);
      return null;
    }
  }

  async getAllImagesAndTags(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Record<string, TagDetail[]>>> {
    const { page = 1, pageSize = 10 } = pagination || {};

    // 获取所有仓库
    const allRepositories = await this.getRepositories();
    const total = allRepositories.length;
    const totalPages = Math.ceil(total / pageSize);

    // 计算当前页的仓库
    const startIndex = (page - 1) * pageSize;
    const repositories = allRepositories.slice(startIndex, startIndex + pageSize);

    const result: Record<string, TagDetail[]> = {};

    await Promise.allSettled(
      repositories.map(async (repository) => {
        try {
          const tags = await this.getTagsList(repository);
          if (!tags.length) {
            result[repository] = [];
            return;
          }

          const tagDetailsPromises = await Promise.allSettled(
            tags.map((tag) => this.getTagDetails(repository, tag))
          );

          result[repository] = tagDetailsPromises
            .filter(
              (r): r is PromiseFulfilledResult<TagDetail | null> =>
                r.status === 'fulfilled' && r.value !== null
            )
            .map((r) => r.value as TagDetail);
        } catch (error) {
          console.error(`Error processing repository ${repository}:`, error);
          result[repository] = [];
        }
      })
    );

    return {
      items: result,
      total,
      page,
      pageSize,
      totalPages
    };
  }
}

function formatSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function formatData(data: Record<string, TagDetail[]>): Record<string, any> {
  return Object.entries(data).reduce((acc, [repo, tags]) => {
    if (tags.length === 0) {
      return acc;
    }

    acc[repo] = tags.map((tag) => ({
      ...tag,
      size: formatSize(tag.size || 0),
      created: new Date(tag.created || '').toLocaleString()
    }));
    return acc;
  }, {} as Record<string, any>);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  if (req.method !== 'GET') {
    return jsonRes(res, {
      code: 405,
      error: new Error('Method not allowed')
    });
  }

  try {
    const { k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // 获取分页参数
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const client = new ImageRegistryClient({
      baseUrl: process.env.IMAGE_REPO_URL!,
      username: process.env.IMAGE_REPO_USERNAME!,
      password: process.env.IMAGE_REPO_PASSWORD!
    });

    const response = await client.getAllImagesAndTags({ page, pageSize });

    const formattedData = formatData(response.items);

    jsonRes(res, {
      data: {
        items: formattedData,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error : new Error('Internal server error')
    });
  }
}
