import { NextRequest } from 'next/server';
import { devboxDB } from '@/services/db/init';
import { jsonRes } from '@/services/backend/response';
import { getRegionUid } from '@/utils/env';
import { parseTemplateConfig } from '@/utils/tools';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const regionUid = getRegionUid();

    const templates = await devboxDB.template.findMany({
      where: {
        isDeleted: false,
        templateRepository: {
          isDeleted: false,
          regionUid,
          isPublic: true
        }
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
            isPublic: true
          }
        }
      }
    });

    const configArray = templates.map((template) => ({
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