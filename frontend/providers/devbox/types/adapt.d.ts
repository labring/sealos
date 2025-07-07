import { TemplateRepositoryKind } from '@/prisma/generated/client';
import type { PortInfos } from '@/types/ingress';
import type { KBDevboxTypeV2 } from '@/types/k8s';
export type GetDevboxByNameReturn = [
  KBDevboxTypeV2,
  PortInfos,
  {
    templateRepository: {
      uid: string;
      name: string;
      iconId: string | null;
      kind: TemplateRepositoryKind;
      description: string | null;
    };
    uid: string;
    name: string;
    image: string;
  }
];
