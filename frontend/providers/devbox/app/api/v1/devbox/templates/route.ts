import { NextRequest } from 'next/server';

import { KBDevboxTypeV2 } from '@/types/k8s';
import { devboxDB } from '@/services/db/init';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { getRegionUid } from '@/utils/env';
import { parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;
    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    
    const { body: devboxBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes'
    )) as {
      body: {
        items: KBDevboxTypeV2[];
      };
    };

    if (!devboxBody.items || devboxBody.items.length === 0) {
      return jsonRes({
        data: []
      });
    }

    const templateIds = [...new Set(devboxBody.items.map((item) => item.spec.templateID))];

    let templates = await devboxDB.template.findMany({
      where: {
        uid: { in: templateIds },
        isDeleted: false
      },
      select: {
        uid: true,
        name: true,
        config: true,
        templateRepository: {
          select: {
            uid: true,
            iconId: true,
            name: true,
            kind: true,
            description: true,
            isPublic: true,
            organization: {
              select: {
                uid: true,
                isDeleted: true
              }
            },
            regionUid: true,
            isDeleted: true
          }
        }
      }
    });

    if (templates.length === 0) {
      templates = await devboxDB.template.findMany({
        where: {
          isDeleted: false
        },
        select: {
          uid: true,
          name: true,
          config: true,
          templateRepository: {
            select: {
              uid: true,
              iconId: true,
              name: true,
              kind: true,
              description: true,
              isPublic: true,
              organization: {
                select: {
                  uid: true,
                  isDeleted: true
                }
              },
              regionUid: true,
              isDeleted: true
            }
          }
        }
      });
    }

    const regionUid = getRegionUid();

    const accessibleTemplates = templates.filter((template) => {
      const regionMatch = template.templateRepository.regionUid === regionUid;
      const notDeleted = template.templateRepository.isDeleted === false;
      const isPublicOrOrgActive = 
        template.templateRepository.isPublic === true ||
        template.templateRepository.organization.isDeleted === false;
      
      return regionMatch && notDeleted && isPublicOrOrgActive;
    });

    const configArray = accessibleTemplates.map((template) => ({
      runtime: template.templateRepository.iconId || template.templateRepository.uid,
      config: parseTemplateConfig(template.config)
    }));

    return jsonRes({
      data: configArray
    });

  } catch (err: any) {
    console.error('Error in getconfig:', err);
    return jsonRes({
      code: 500,
      error: err?.message || err
    });
  }
}