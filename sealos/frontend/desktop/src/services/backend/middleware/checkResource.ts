import { RESOURCE_STATUS } from '@/types/response/checkResource';
import { NextApiRequest, NextApiResponse } from 'next';
import { JoinStatus } from 'prisma/region/generated/client';
import { generateAuthenticationToken } from '../auth';
import { globalPrisma, prisma } from '../db/init';
import { getUserKubeconfigNotPatch } from '../kubernetes/admin';
import { jsonRes } from '../response';

export const resourceGuard =
  (userUid: string) => async (res: NextApiResponse, next?: () => void) => {
    const userCr = await prisma.userCr.findUnique({
      where: {
        userUid
      },
      include: {
        userWorkspace: {
          include: {
            workspace: true
          }
        }
      }
    });
    if (!userCr)
      return jsonRes(res, {
        message: RESOURCE_STATUS.USER_CR_NOT_FOUND,
        code: 404
      });
    const userWorkspaces = userCr.userWorkspace;
    const privateUserWorkspace = userWorkspaces.find((w) => w.isPrivate);
    if (!privateUserWorkspace)
      return jsonRes(res, {
        message: RESOURCE_STATUS.PRIVATE_WORKSPACE_NOT_FOUND,
        code: 404
      });
    const OwnerWorspaces = userWorkspaces.filter(
      (w) => w.role === 'OWNER' && w.status === JoinStatus.IN_WORKSPACE
    );
    if (OwnerWorspaces.length > 1)
      return jsonRes(res, {
        message: RESOURCE_STATUS.REMAIN_WORKSACE_OWNER,
        code: 409
      });

    // const cvmUrl = `https://cloudserver.${global.AppConfig.cloud.domain}`
    const baseTemplateUrl = global.AppConfig.common.templateUrl;
    const baseObjectStorageUrl = global.AppConfig.common.objectstorageUrl;
    const baseApplaunchPadUrl = global.AppConfig.common.applaunchpadUrl;
    const baseDbproviderUrl = global.AppConfig.common.dbproviderUrl;

    const kc = await getUserKubeconfigNotPatch(userCr.crName);
    if (!kc)
      return jsonRes(res, {
        message: RESOURCE_STATUS.KUBECONFIG_NOT_FOUND,
        code: 404
      });
    const authorization = encodeURI(kc);
    const genReq = (url: string) =>
      fetch(url, {
        headers: {
          authorization
        }
      });
    const fetchFilter = async (resource: Response) => {
      const result: { isOk: boolean; data: any } = {
        isOk: false,
        data: undefined
      };
      if (!resource.ok) {
        await jsonRes(res, {
          code: 500,
          message: RESOURCE_STATUS.GET_RESOURCE_ERROR
        });
      } else {
        result.isOk = true;
        result.data = await resource.clone().json();
      }
      return result;
    };
    if (baseTemplateUrl) {
      const templateUrl = baseTemplateUrl + '/api/instance/list';
      const result = await fetchFilter(await genReq(templateUrl));
      if (!result.isOk) return;
      if (result.data?.data?.items?.length !== 0)
        return jsonRes(res, {
          code: 409,
          message: RESOURCE_STATUS.REMAIN_TEMPLATE
        });
    }
    if (baseObjectStorageUrl) {
      const objectStorageUrl = baseObjectStorageUrl + '/api/bucket/list';
      const result = await fetchFilter(await genReq(objectStorageUrl));
      if (!result.isOk) return;
      if (result.data?.data?.list.length !== 0)
        return jsonRes(res, {
          code: 409,
          message: RESOURCE_STATUS.REMAIN_OBJECT_STORAGE
        });
    }
    if (baseApplaunchPadUrl) {
      const applaunchPadUrl = baseApplaunchPadUrl + '/api/getApps';
      const result = await fetchFilter(await genReq(applaunchPadUrl));
      if (!result.isOk) return;
      if (result.data?.data?.length !== 0)
        return jsonRes(res, {
          code: 409,
          message: RESOURCE_STATUS.REMAIN_APP
        });
    }
    if (baseDbproviderUrl) {
      const dbproviderUrl = baseDbproviderUrl + '/api/getDBList';
      const result = await fetchFilter(await genReq(dbproviderUrl));
      if (!result.isOk) return;
      if (result.data?.data?.length !== 0)
        return jsonRes(res, {
          code: 409,
          message: RESOURCE_STATUS.REMAIN_DATABASE
        });
    }
    await Promise.resolve(next?.());
  };

export const otherRegionResourceGuard =
  (userUid: string, userId: string) => async (res: NextApiResponse, next?: () => void) => {
    const regionList = await globalPrisma.region.findMany();
    const regionTarget = regionList.filter(
      (region) => region.uid !== global.AppConfig.cloud.regionUID
    );
    const otherCheckResp = await Promise.all(
      regionTarget.map((region) =>
        fetch(
          process.env.NODE_ENV === 'development'
            ? `http://127.0.0.1:3000/api/auth/delete/checkResource`
            : `https://${region.domain}/api/auth/delete/checkResource`,
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
      const resp = otherData[i];
      if (resp?.message === RESOURCE_STATUS.INTERNAL_SERVER_ERROR) {
        return jsonRes(res, {
          code: 500,
          message: RESOURCE_STATUS.GET_RESOURCE_ERROR
        });
      }
      if (
        resp?.message !== RESOURCE_STATUS.RESULT_SUCCESS &&
        resp?.message !== RESOURCE_STATUS.USER_CR_NOT_FOUND
      )
        return jsonRes(res, {
          code: 409,
          message: RESOURCE_STATUS.REMAIN_OTHER_REGION_RESOURCE
        });
    }
    await Promise.resolve(next?.());
  };

export const filterForceDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: { code: string }) => void
) => {
  const { code } = req.body as { code: string };
  if (!code)
    return jsonRes(res, {
      code: 400,
      message: 'invalid code'
    });
  await Promise.resolve(next({ code }));
};
