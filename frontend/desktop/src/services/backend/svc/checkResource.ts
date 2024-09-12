import { ApiResp } from '@/types';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import dayjs from 'dayjs';
import { NextApiResponse } from 'next';
import { Region } from 'prisma/global/generated/client';
import { Role, Workspace } from 'prisma/region/generated/client';
import { generateAuthenticationToken, generateBillingToken, generateOnceToken } from '../auth';
import { globalPrisma, prisma } from '../db/init';
import { jsonRes } from '../response';
type ResourceRawType = {
  namespace: string;
  type: number;
  parent_type?: 8;
  parent_name?: string;
  name?: string;
};
export type ResourceType = {
  workspace: Workspace;
  type: number;
  name?: string;
};
export type RegionResourceType = {
  region: Region;
  resource: ResourceType[];
};
const checkResourceResponse = async (userId: string, userUid: string, userCrName: string) => {
  const itemList = await prisma.userCr.findMany({
    where: {
      userUid
    },
    include: {
      userWorkspace: {
        include: {
          workspace: true
        },
        where: {
          role: Role.OWNER
        }
      }
    }
  });
  const workspaceList = itemList.flatMap((item) =>
    item.userWorkspace.map((userWorkspace) => userWorkspace.workspace)
  );
  const namespaceList = workspaceList.map((workspace) => workspace.id);
  const endTime = new Date();
  const startTime = dayjs(endTime).subtract(1, 'hours').toISOString();
  const authorization =
    'Bearer ' +
    encodeURI(
      generateBillingToken({
        userUid,
        userId
      })
    );
  const response = await fetch(
    `${global.AppConfig.desktop.auth.billingUrl}/account/v1alpha1/user-usage`,
    {
      method: 'POST',
      headers: {
        authorization
      },
      body: JSON.stringify({
        startTime,
        endTime,
        namespaceList
      })
    }
  );
  const data = (await response.json()) as {
    data: ResourceRawType[];
  };
  if (!response.ok) {
    throw new Error(RESOURCE_STATUS.GET_RESOURCE_ERROR);
  }
  return (data.data || [])
    .flatMap<ResourceType>((d) => {
      const workspace = workspaceList.find((workspace) => workspace.id === d.namespace);
      if (!workspace) return [];
      if (d?.parent_type === 8 && d.parent_name) {
        return [
          {
            workspace,
            type: d.parent_type,
            name: d.name
          }
        ];
      }
      return [
        {
          workspace,
          type: d.type,
          name: d.name
        }
      ];
    })
    .reduce<ResourceType[]>((acc, current) => {
      const x = acc.findIndex((item) => item.name === current.name);
      if (x === -1) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);
};
export const checkCurrentResourceSvc =
  (userId: string, userUid: string) => async (res: NextApiResponse, next?: () => void) => {
    const userCr = await prisma.userCr.findUnique({
      where: {
        userUid
      }
    });
    if (!userCr) {
      return jsonRes(res, {
        code: 200,
        message: RESOURCE_STATUS.RESULT_SUCCESS,
        data: []
      });
    }
    const resoucreList = await checkResourceResponse(userId, userUid, userCr.crName);

    if (resoucreList.length > 0) {
      return jsonRes(res, {
        code: 409,
        message: RESOURCE_STATUS.REMAIN_RESOURCE,
        data: resoucreList
      });
    } else {
      jsonRes(res, {
        code: 200,
        message: RESOURCE_STATUS.RESULT_SUCCESS,
        data: []
      });
    }
    await Promise.resolve(next?.());
  };

export const allRegionResourceSvc =
  (userUid: string, userId: string, userCrName: string) =>
  async (res: NextApiResponse, next?: () => void) => {
    const regionList = await globalPrisma.region.findMany();
    const regionTarget = regionList.filter(
      (region) => region.uid !== global.AppConfig.cloud.regionUID
    );
    const currentRegion = regionList.find(
      (region) => region.uid === global.AppConfig.cloud.regionUID
    );

    const regionResourceList: RegionResourceType[] = [];

    const currentResourceCheck = await checkResourceResponse(userId, userUid, userCrName);
    if (!currentRegion) throw new Error('current region not found');

    if (currentResourceCheck.length > 0)
      regionResourceList.push({
        region: currentRegion,
        resource: currentResourceCheck
      });
    const otherCheckResp = await Promise.all(
      regionTarget.map((region) =>
        fetch(
          process.env.NODE_ENV === 'development'
            ? `http://127.0.0.1:3000/api/auth/delete/checkCurrentResource`
            : `https://${region.domain}/api/auth/delete/checkCurrentResource`,
          {
            headers: {
              authorization: encodeURI(
                generateAuthenticationToken({
                  userUid: userUid,
                  userId: userId
                })
              )
            }
          }
        )
      )
    );
    if (otherCheckResp.some((resp) => !resp.ok))
      return jsonRes(res, {
        code: 500,
        message: RESOURCE_STATUS.GET_RESOURCE_ERROR
      });
    const otherData = await Promise.all(otherCheckResp.map((resp) => resp.clone().json()));
    for (let i = 0; i < otherData.length; i++) {
      const resp = otherData[i] as ApiResp<ResourceType[]>;
      if (resp?.message === RESOURCE_STATUS.INTERNAL_SERVER_ERROR) {
        return jsonRes(res, {
          code: 500,
          message: RESOURCE_STATUS.GET_RESOURCE_ERROR
        });
      }
      if (resp?.message === RESOURCE_STATUS.REMAIN_RESOURCE) {
        regionResourceList.push({
          region: regionTarget[i],
          resource: resp.data || []
        });
      }
    }
    const code = await generateOnceToken({
      userUid,
      type: 'deleteUser'
    });

    if (regionResourceList.length > 0) {
      jsonRes(res, {
        code: 200,
        message: RESOURCE_STATUS.REMAIN_RESOURCE,
        data: {
          regionResourceList,
          code
        }
      });
    } else {
      jsonRes(res, {
        code: 200,
        message: RESOURCE_STATUS.RESULT_SUCCESS,
        data: {
          regionResourceList,
          code
        }
      });
    }
    await Promise.resolve(next?.());
  };
