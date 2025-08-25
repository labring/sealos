import { Tag, TemplateRepositoryKind } from '@/prisma/generated/client';
import { DELETE, GET, POST } from '@/services/request';
import {
  CreateTemplateRepositoryType,
  UpdateTemplateRepositoryType,
  UpdateTemplateType
} from '@/utils/validate';

export const listOfficialTemplateRepository = () =>
  GET<{
    templateRepositoryList: {
      uid: string;
      name: string;
      kind: TemplateRepositoryKind;
      iconId: string;
      description: string | null;
      templateRepositoryTags: {
        tag: Tag;
      }[];
    }[];
  }>(`/api/templateRepository/listOfficial`);
export const listTemplateRepository = (
  page: {
    page: number;
    pageSize: number;
  },
  tags?: string[],
  search?: string
) => {
  const searchParams = new URLSearchParams();
  if (tags && tags.length > 0) {
    tags.forEach((tag) => {
      searchParams.append('tags', tag);
    });
  }
  searchParams.append('page', page.page.toString());
  searchParams.append('pageSize', page.pageSize.toString());
  if (search) searchParams.append('search', search);
  return GET<{
    templateRepositoryList: {
      uid: string;
      name: string;
      description: string | null;
      iconId: string | null;
      templates: {
        uid: string;
        name: string;
      }[];
      templateRepositoryTags: {
        tag: Tag;
      }[];
    }[];
    page: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPage: number;
    };
  }>(`/api/templateRepository/list?${searchParams.toString()}`);
};
export const listPrivateTemplateRepository = ({
  search,
  page,
  pageSize
}: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) => {
  const searchParams = new URLSearchParams();

  if (search) searchParams.append('search', search);
  if (page) searchParams.append('page', page.toString());
  if (pageSize) searchParams.append('pageSize', pageSize.toString());
  return GET<{
    templateRepositoryList: {
      uid: string;
      name: string;
      description: string | null;
      iconId: string | null;
      templates: {
        uid: string;
        name: string;
      }[];
      isPublic: boolean;
      templateRepositoryTags: {
        tag: Tag;
      }[];
    }[];
    page: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPage: number;
    };
  }>(`/api/templateRepository/listPrivate?${searchParams.toString()}`);
};

export const getTemplateRepository = (uid: string) =>
  GET<{
    templateRepository: {
      templates: {
        name: string;
        uid: string;
      }[];
      uid: string;
      isPublic: true;
      name: string;
      description: string | null;
      iconId: string | null;
      templateRepositoryTags: {
        tag: Tag;
      }[];
    };
  }>(`/api/templateRepository/get?uid=${uid}`);
export const getTemplateConfig = (uid: string) =>
  GET<{
    template: {
      name: string;
      uid: string;
      config: string;
    };
  }>(`/api/templateRepository/template/getConfig?uid=${uid}`);
export const listTemplate = (templateRepositoryUid: string) =>
  GET<{
    templateList: {
      uid: string;
      name: string;
      config: string;
      image: string;
      createAt: Date;
      updateAt: Date;
    }[];
  }>(`/api/templateRepository/template/list?templateRepositoryUid=${templateRepositoryUid}`);
export const listTag = () =>
  GET<{
    tagList: Tag[];
  }>(`/api/templateRepository/tag/list`);

export const createTemplateRepository = (data: CreateTemplateRepositoryType) =>
  POST(`/api/templateRepository/withTemplate/create`, data);
export const initUser = () => POST<string>(`/api/auth/init`);

export const deleteTemplateRepository = (templateRepositoryUid: string) =>
  DELETE(`/api/templateRepository/delete?templateRepositoryUid=${templateRepositoryUid}`);

export const updateTemplateRepository = (data: UpdateTemplateRepositoryType) =>
  POST(`/api/templateRepository/update`, data);
export const updateTemplate = (data: UpdateTemplateType) =>
  POST(`/api/templateRepository/withTemplate/update`, data);
export const deleteTemplate = (templateUid: string) =>
  DELETE(`/api/templateRepository/template/delete?uid=${templateUid}`);
