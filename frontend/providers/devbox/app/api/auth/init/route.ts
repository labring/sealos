import { authSessionWithDesktopJWT, generateDevboxToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { getRegionUid } from '@/utils/env';
import { makeOrganizationName } from '@/utils/user';

import { NextRequest } from 'next/server';

const findOrCreateUser = async (regionUid: string, namespaceId: string) => {
  return await devboxDB.$transaction(async (tx) => {
    try {
      const user = await tx.user.findUnique({
        where: {
          isDeleted_regionUid_namespaceId: {
            regionUid,
            namespaceId,
            isDeleted: false
          }
        },
        select: {
          uid: true,
          userOrganizations: {
            select: {
              organization: {
                select: {
                  uid: true
                }
              }
            }
          }
        }
      });
      if (user && user.userOrganizations.length > 0) {
        return user;
      }
      const organizationName = makeOrganizationName();

      if (!user) {
        const user = await tx.user.create({
          data: {
            regionUid,
            namespaceId,
            userOrganizations: {
              create: {
                organization: {
                  create: {
                    name: organizationName,
                    id: organizationName
                  }
                }
              }
            }
          },
          select: {
            uid: true,
            userOrganizations: {
              select: {
                organization: {
                  select: {
                    uid: true
                  }
                }
              }
            }
          }
        });
        return user;
      }
      if (!user.userOrganizations.length) {
        const user = await tx.user.update({
          where: {
            isDeleted_regionUid_namespaceId: {
              regionUid,
              namespaceId,
              isDeleted: false
            }
          },
          data: {
            userOrganizations: {
              create: {
                organization: {
                  create: {
                    name: organizationName,
                    id: organizationName
                  }
                }
              }
            }
          },
          select: {
            uid: true,
            userOrganizations: {
              select: {
                organization: {
                  select: {
                    uid: true
                  }
                }
              }
            }
          }
        });
        return user;
      }
      throw new Error('Failed to find or create user');
    } catch (error) {
      console.error('Error in findOrCreateUser transaction:', error);
      throw new Error('Failed to find or create user');
    }
  });
};
export async function POST(req: NextRequest) {
  const regionUid = getRegionUid();
  if (!regionUid) {
    console.log('REGION_UID is not set');
    return jsonRes({
      code: 500
    });
  }
  try {
    const headerList = req.headers;
    const { payload } = await authSessionWithDesktopJWT(headerList);
    const user = await findOrCreateUser(regionUid, payload.workspaceId);
    if (!user) {
      return jsonRes({
        code: 500,
        error: 'Failed to find or create user'
      });
    }
    return jsonRes({
      data: generateDevboxToken({
        userUid: user.uid,
        organizationUid: user.userOrganizations[0].organization.uid,
        regionUid,
        workspaceId: payload.workspaceId
      })
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
