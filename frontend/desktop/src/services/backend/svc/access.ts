import { SemData } from '@/types/sem';
import { NextApiResponse } from 'next';
import { ProviderType, UserStatus } from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';
import { getGlobalToken } from '../globalAuth';
import { jsonRes } from '../response';
import { createMiddleware } from '@/utils/factory';
type AuthContext = {
  avatar_url: string;
  providerId: string;
  name: string;
  providerType: ProviderType;
  email?: string;
  password?: string;
  inviterId?: string;
  semData?: SemData;
  bdVid?: string;
};
export const getGlobalTokenSvc = createMiddleware<AuthContext, unknown>(
  async ({ req, res, next, ctx }) => {
    const data = await getGlobalToken({
      provider: ctx.providerType,
      providerId: ctx.providerId,
      avatar_url: ctx.avatar_url,
      name: ctx.name,
      email: ctx.email,
      inviterId: ctx.inviterId,
      password: ctx.password,
      semData: ctx.semData,
      bdVid: ctx.bdVid
    });

    if (data?.isRestricted) {
      return jsonRes(res, {
        code: 401,
        message: 'Account banned'
      });
    }

    if (!data)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });

    return jsonRes(res, {
      data,
      code: 200,
      message: 'Successfully'
    });
  }
);
// export const getGlobalTokenSvc =

//   (
//     avatar_url: string,
//     providerId: string,
//     name: string,
//     providerType: ProviderType,
//     email?: string,
//     password?: string,
//     inviterId?: string,
//     semData?: SemData,
//     bdVid?: string
//   ) =>
//     async (res: NextApiResponse, next?: () => void) => {
//       const data = await getGlobalToken({
//         provider: providerType,
//         providerId,
//         avatar_url,
//         name,
//         email,
//         inviterId,
//         password,
//         semData,
//         bdVid
//       });
//       if (!data)
//         return jsonRes(res, {
//           code: 401,
//           message: 'Unauthorized'
//         });
//       return jsonRes(res, {
//         data,
//         code: 200,
//         message: 'Successfully'
//       });
//     };

// export const getGlobalTokenByGithubSvc = (
//   avatar_url: string,
//   providerId: string,
//   name: string,
//   email: string,
//   inviterId?: string,
//   semData?: SemData,
//   bdVid?: string
// ) =>
//   getGlobalTokenSvc(
//     avatar_url,
//     providerId,
//     name,
//     ProviderType.GITHUB,
//     email,
//     undefined,
//     inviterId,
//     semData,
//     bdVid
//   );
// export const getGlobalTokenByWechatSvc = (
//   avatar_url: string,
//   providerId: string,
//   name: string,
//   inviterId?: string,
//   semData?: SemData,
//   bdVid?: string
// ) =>
//   getGlobalTokenSvc(
//     avatar_url,
//     providerId,
//     name,
//     ProviderType.WECHAT,
//     undefined,
//     undefined,
//     inviterId,
//     semData,
//     bdVid
//   );
// export const getGlobalTokenByPhoneSvc = (
//   phone: string,
//   inviterId?: string,
//   semData?: SemData,
//   bdVid?: string
// ) =>
//   getGlobalTokenSvc(
//     '',
//     phone,
//     phone,
//     ProviderType.PHONE,
//     undefined,
//     undefined,
//     inviterId,
//     semData,
//     bdVid
//   );
// export const getGlobalTokenByPasswordSvc = (name: string, password: string, inviterId?: string) =>
//   getGlobalTokenSvc('', name, name, ProviderType.PASSWORD, password, inviterId);
// export const getGlobalTokenByGoogleSvc = (
//   avatar_url: string,
//   providerId: string,
//   name: string,
//   email: string,
//   inviterId?: string,
//   semData?: SemData,
//   bdVid?: string
// ) =>
//   getGlobalTokenSvc(
//     avatar_url,
//     providerId,
//     name,
//     ProviderType.GOOGLE,
//     email,
//     undefined,
//     inviterId,
//     semData,
//     bdVid
//   );

// export const checkUserStatusSvc =
//   (userUid: string) => async (res: NextApiResponse, next?: () => void) => {
//     const user = await globalPrisma.user.findUnique({
//       where: {
//         uid: userUid,
//         status: UserStatus.NORMAL_USER
//       }
//     });
//     if (!user)
//       return jsonRes(res, {
//         code: 401,
//         message: 'Unauthorized'
//       });
//     jsonRes(res, {
//       code: 200,
//       message: 'Successfully'
//     });
//     next?.();
//   };

export const checkUserStatusSvc = createMiddleware<{ userUid: string }>(
  async ({ req, res, next, ctx }) => {
    const { userUid } = ctx;
    const user = await globalPrisma.user.findUnique({
      where: {
        uid: userUid,
        status: UserStatus.NORMAL_USER
      }
    });
    if (!user)
      return jsonRes(res, {
        code: 401,
        message: 'Unauthorized'
      });
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
    next?.();
  }
);
