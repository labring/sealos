import { TemplateRepositoryKind } from '@/prisma/generated/client';

export type TemplateRepository = {
  uid: string;
  name: string;
  kind: TemplateRepositoryKind;
  iconId: string;
  description: string | null;
};
