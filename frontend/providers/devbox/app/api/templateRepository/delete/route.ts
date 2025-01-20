import { authSessionWithJWT } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const headerList = req.headers;
    const { searchParams } = req.nextUrl;
    const idRaw = searchParams.get('templateRepositoryUid') as string;

    const result = z.string().uuid().safeParse(idRaw);
    if (!result.success) {
      return jsonRes({
        code: 400,
        error: 'Invalid template id'
      });
    }
    const uid = result.data;
    const { payload } = await authSessionWithJWT(headerList);

    const deletedAt = new Date();
    const regionUid = getRegionUid();
    await devboxDB.templateRepository.update({
      where: {
        uid,
        organizationUid: payload.organizationUid,
        isDeleted: false,
        regionUid
      },
      data: {
        deletedAt,
        isDeleted: null,
        templates: {
          updateMany: {
            where: {
              templateRepositoryUid: uid,
              isDeleted: false
            },
            data: {
              deletedAt,
              isDeleted: null
            }
          }
        }
      }
    });
    return jsonRes({
      data: {
        isDeleted: true
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
