import { TemplateRepositoryKind } from '@/prisma/generated/client';

export type TemplateRepository = {
  uid: string;
  name: string;
  kind: TemplateRepositoryKind;
  iconId: string;
  icon?: string | null;
  description: string | null;
  usageCount?: number;
};
