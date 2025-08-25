import { Prisma } from '@/prisma/generated/client';
import { authSessionWithJWT } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { NextRequest } from 'next/server';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;
    const searchParams = req.nextUrl.searchParams;
    const { payload } = await authSessionWithJWT(headerList);

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

    const queryWhereInput: Prisma.TemplateRepositoryWhereInput = {
      isDeleted: false,
      organizationUid: payload.organizationUid,
      ...(search
        ? {
            name: {
              contains: search
            }
          }
        : {})
    };
    const templateRepositoryList = await devboxDB.templateRepository.findMany({
      where: queryWhereInput,
      select: {
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
        isPublic: true,
        description: true,
        iconId: true
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      }
    });
    const totalItems = await devboxDB.templateRepository.count({
      where: queryWhereInput
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
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
