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

export interface ImageHubItem {
  image: string;
  tag: string;
  size?: number;
  created?: string;
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
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ImageRegistryClient {
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
  ): Promise<PaginatedResponse<ImageHubItem[]>> {
    const { page = 1, pageSize = 10, search = '' } = pagination || {};

    // 获取所有仓库
    const allRepositories = await this.getRepositories();
    const allTags: ImageHubItem[] = [];

    // 获取所有仓库的所有标签
    await Promise.allSettled(
      allRepositories.map(async (repository) => {
        try {
          const tags = await this.getTagsList(repository);
          if (!tags.length) return;

          const tagDetailsPromises = await Promise.allSettled(
            tags.map((tag) => this.getTagDetails(repository, tag))
          );

          tagDetailsPromises
            .filter(
              (r): r is PromiseFulfilledResult<TagDetail | null> =>
                r.status === 'fulfilled' && r.value !== null
            )
            .forEach((r) => {
              allTags.push({
                image: repository,
                tag: r.value?.name || '',
                size: r.value?.size,
                created: r.value?.created
              });
            });
        } catch (error) {
          console.error(`Error processing repository ${repository}:`, error);
        }
      })
    );

    allTags.sort((a, b) => {
      return a.image.localeCompare(b.image);
    });

    // 在排序之后，分页之前添加搜索过滤
    const filteredTags = search
      ? allTags.filter((item) => item.image.toLowerCase().includes(search.toLowerCase()))
      : allTags;

    // 使用过滤后的结果计算分页
    const total = filteredTags.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedTags = filteredTags.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedTags,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async getManifestDigest(repository: string, tag: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/${repository}/manifests/${tag}`, {
        method: 'HEAD',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get manifest digest: ${response.status} ${response.statusText}`);
      }

      const digest = response.headers.get('Docker-Content-Digest');
      if (!digest) {
        throw new Error('Manifest digest not found in response headers');
      }

      return digest;
    } catch (error) {
      console.error(`Error getting manifest digest for ${repository}:${tag}:`, error);
      return null;
    }
  }

  async deleteImage(repository: string, tag: string): Promise<boolean> {
    try {
      // 首先获取镜像的 manifest digest
      const digest = await this.getManifestDigest(repository, tag);
      if (!digest) {
        throw new Error('Failed to get manifest digest');
      }

      // 使用 digest 删除镜像
      const response = await fetch(`${this.config.baseUrl}/${repository}/manifests/${digest}`, {
        method: 'DELETE',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting image ${repository}:${tag}:`, error);
      return false;
    }
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
    const search = (req.query.search as string) || '';

    const client = new ImageRegistryClient({
      baseUrl: process.env.IMAGE_REPO_URL!,
      username: process.env.IMAGE_REPO_USERNAME!,
      password: process.env.IMAGE_REPO_PASSWORD!
    });

    const response = await client.getAllImagesAndTags({ page, pageSize, search });

    jsonRes(res, {
      data: {
        items: response.items,
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
