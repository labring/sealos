import { Prisma } from '@/prisma/generated/client';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const regionUid = getRegionUid();
    const categoryNames = ['language', 'framework', 'os', 'mcp'] as const;

    const [officialTags, categoryTags] = await Promise.all([
      devboxDB.tag.findMany({
        where: {
          type: 'OFFICIAL_CONTENT'
        },
        select: {
          uid: true
        }
      }),
      devboxDB.tag.findMany({
        where: {
          name: { in: categoryNames as unknown as string[] },
          type: 'USE_CASE'
        },
        select: {
          uid: true,
          name: true
        }
      })
    ]);

    const officialTagUids = officialTags.map((tag) => tag.uid);
    const categoryTagMap = new Map(categoryTags.map((tag) => [tag.name, tag.uid]));

    const categoryPromises = categoryNames.map(async (categoryName) => {
      const categoryTagUid = categoryTagMap.get(categoryName);

      if (!categoryTagUid) {
        return { categoryName, templates: [] };
      }

      const allTagUids = [categoryTagUid, ...officialTagUids];

      const where: Prisma.TemplateRepositoryWhereInput = {
        templates: {
          some: {
            isDeleted: false
          }
        },
        isPublic: true,
        isDeleted: false,
        regionUid,
        AND: allTagUids.map((tagUid) => ({
          templateRepositoryTags: {
            some: {
              tagUid
            }
          }
        }))
      };

      const templates = await devboxDB.templateRepository.findMany({
        where,
        select: {
          organization: {
            select: {
              name: true
            }
          },
          templateRepositoryTags: {
            select: {
              tag: true
            }
          },
          templates: {
            where: {
              isDeleted: false
            },
            select: {
              name: true,
              uid: true
            }
          },
          name: true,
          uid: true,
          description: true,
          iconId: true,
          createdAt: true,
          usageCount: true
        },
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
        take: 5
      });

      return { categoryName, templates };
    });

    const results = await Promise.all(categoryPromises);

    const overviewData = results.reduce(
      (acc, result) => {
        acc[result.categoryName] = result.templates;
        return acc;
      },
      {} as Record<string, any[]>
    );

    return jsonRes({
      data: overviewData
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
