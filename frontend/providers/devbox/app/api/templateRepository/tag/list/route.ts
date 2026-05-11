import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tagList = await devboxDB.tag.findMany({
      where: {}
    });

    return jsonRes({
      data: {
        tagList
      }
    });
  } catch (err: any) {
    console.log(err);
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
