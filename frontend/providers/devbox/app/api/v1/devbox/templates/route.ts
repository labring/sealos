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
          isPublic: true,
          templateRepositoryTags: {
            some: {
              tag: {
                type: 'OFFICIAL_CONTENT'
              }
            }
          }
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
    console.log('templates', templates);

    const configArray = templates.map((template) => ({
      runtime: template.templateRepository.iconId || template.templateRepository.uid,
      config: parseTemplateConfig(template.config)
    }));

    const seenRuntimes = new Set<string>();
    const uniqueConfigArray = configArray.filter((item) => {
      if (seenRuntimes.has(item.runtime)) {
        return false;
      }
      seenRuntimes.add(item.runtime);
      return true;
    });
    return jsonRes({
      data: uniqueConfigArray
    });

  } catch (err: any) {
    console.error('Error in getconfig:', err);
    return jsonRes({
      code: 500,
      error: err?.message || err
    });
  }
}