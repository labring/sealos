import { NextRequest, NextResponse } from 'next/server';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { parseTemplateConfig } from '@/utils/tools';
import { sendError, ErrorType, ErrorCode } from '@/app/api/v2alpha/api-error';
import { authSession } from '@/services/backend/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await authSession(req.headers);
  } catch {
    return sendError({
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Invalid or missing Authorization header'
    });
  }
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
    return NextResponse.json(uniqueConfigArray);
  } catch (err: any) {
    console.error('Error in getconfig:', err);
    return sendError({
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: err?.message || 'Internal server error'
    });
  }
}
