import { Prisma } from '@/prisma/generated/client';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { NextRequest } from 'next/server';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tags = searchParams.getAll('tags') || [];
    const search = searchParams.get('search') || '';
    const page =
      z
        .number()
        .int()
        .positive()
        .safeParse(Number(searchParams.get('page'))).data || 1;
    const pageSize =
      z
        .number()
        .int()
        .min(1)
        .safeParse(Number(searchParams.get('pageSize'))).data || 30;
    const dbquery: Prisma.TemplateRepositoryWhereInput = {
      ...(tags && tags.length > 0
        ? {
            AND: tags.map((tag) => ({
              templateRepositoryTags: {
                some: {
                  tagUid: tag
                }
              }
            }))
          }
        : {}),
      ...(search && search.length > 0
        ? {
            name: {
              contains: search
            }
          }
        : {})
    };
    const [templateRepositoryList, totalItems] = await devboxDB.$transaction(async (tx) => {
      const validRepoIds = await tx.template.findMany({
        where: {
          isDeleted: false
        },
        select: {
          templateRepositoryUid: true
        },
        distinct: ['templateRepositoryUid']
      });

      const where: Prisma.TemplateRepositoryWhereInput = {
        uid: {
          in: validRepoIds.map((r) => r.templateRepositoryUid)
        },
        isPublic: true,
        isDeleted: false,
        ...dbquery
      };
      const [templateRepositoryList, totalItems] = await Promise.all([
        tx.templateRepository.findMany({
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
            iconId: true
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [
            {
              createdAt: 'asc'
            }
          ]
        }),
        tx.templateRepository.count({
          where: dbquery
        })
      ]);
      return [templateRepositoryList, totalItems];
    });

    return jsonRes({
      data: {
        templateRepositoryList,
        page: {
          page,
          pageSize,
          totalItems,
          totalPage: Math.ceil(totalItems / pageSize)
        }
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return jsonRes({
        code: 400,
        error: err.message
      });
    }
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
