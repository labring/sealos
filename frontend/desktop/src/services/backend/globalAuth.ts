import { hashPassword, verifyPassword } from '@/utils/crypto';
import { enableSignUp } from '../enable';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { ProviderType, User } from 'prisma/global/generated/client';
import { nanoid } from 'nanoid';
import { generateAuthenticationToken } from '@/services/backend/auth';
import { AuthConfigType } from '@/types';
import { SemData } from '@/types/sem';
import { uploadConvertData } from '@/api/platform';

async function signIn({ provider, id }: { provider: ProviderType; id: string }) {
  const userProvider = await globalPrisma.oauthProvider.findUnique({
    where: {
      providerId_providerType: {
        providerType: provider,
        providerId: id
      }
    },
    include: {
      user: true
    }
  });
  if (!userProvider) return null;
  return {
    user: userProvider.user
  };
}

export const inviteHandler = ({
  inviteeId,
  inviterId,
  signResult
}: {
  inviteeId: string;
  inviterId: string;
  signResult: any;
}) => {
  const conf = global.AppConfig?.desktop.auth as AuthConfigType;
  const inviteEnabled = conf.invite?.enabled || false;
  const secretKey = conf.invite?.lafSecretKey || '';
  const baseUrl = conf.invite?.lafBaseURL || '';

  if (!inviteEnabled || !baseUrl || inviterId === inviteeId) return;

  const payload = {
    inviterId,
    inviteeId,
    secretKey: secretKey,
    data: {
      type: 'signup',
      signResult
    }
  };

  fetch(`https://${baseUrl}/uploadData`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Upload laf success:', data);
    })
    .catch((error) => {
      console.error('Upload laf error:', error);
    });
};

export async function signInByPassword({ id, password }: { id: string; password: string }) {
  const userProvider = await globalPrisma.oauthProvider.findUnique({
    where: {
      providerId_providerType: {
        providerType: ProviderType.PASSWORD,
        providerId: id
      },
      password: hashPassword(password)
    },
    include: {
      user: true
    }
  });
  if (!userProvider) return null;
  return {
    user: userProvider.user
  };
}

async function signUp({
  provider,
  id,
  name: nickname,
  avatar_url,
  semData
}: {
  provider: ProviderType;
  id: string;
  name: string;
  avatar_url: string;
  semData?: SemData;
}) {
  const name = nanoid(10);
  try {
    const result = await globalPrisma.$transaction(async (tx) => {
      const user: User = await tx.user.create({
        data: {
          name: name,
          id: name,
          nickname: nickname,
          avatarUri: avatar_url,
          oauthProvider: {
            create: {
              providerId: id,
              providerType: provider
            }
          }
        }
      });

      if (semData?.channel) {
        await tx.userSemChannel.create({
          data: {
            userUid: user.uid,
            channel: semData.channel,
            ...(semData.additionalInfo && { additionalInfo: semData.additionalInfo })
          }
        });
      }

      return { user };
    });

    return result;
  } catch (error) {
    console.error('globalAuth: Error during sign up:', error);
    return null;
  }
}

export async function signUpByPassword({
  id,
  name: nickname,
  avatar_url,
  password,
  semData
}: {
  id: string;
  name: string;
  avatar_url: string;
  password: string;
  semData?: SemData;
}) {
  const name = nanoid(10);

  try {
    const result = await globalPrisma.$transaction(async (tx) => {
      const user: User = await tx.user.create({
        data: {
          nickname,
          avatarUri: avatar_url,
          id: name,
          name,
          oauthProvider: {
            create: {
              providerId: id,
              providerType: ProviderType.PASSWORD,
              password: hashPassword(password)
            }
          }
        }
      });

      if (semData?.channel) {
        await tx.userSemChannel.create({
          data: {
            userUid: user.uid,
            channel: semData.channel,
            ...(semData.additionalInfo && { additionalInfo: semData.additionalInfo })
          }
        });
      }

      return { user };
    });

    return result;
  } catch (error) {
    console.error('globalAuth: Error during sign up:', error);
    return null;
  }
}

export async function updatePassword({ id, password }: { id: string; password: string }) {
  return globalPrisma.oauthProvider.update({
    where: {
      providerId_providerType: {
        providerId: id,
        providerType: ProviderType.PASSWORD
      }
    },
    data: {
      password
    }
  });
}
export async function findUser({ userUid }: { userUid: string }) {
  return globalPrisma.user.findUnique({
    where: {
      uid: userUid
    },
    include: {
      oauthProvider: true
    }
  });
}

export const getGlobalToken = async ({
  provider,
  providerId,
  name,
  avatar_url,
  password,
  inviterId,
  semData,
  bdVid
}: {
  provider: ProviderType;
  providerId: string;
  name: string;
  avatar_url: string;
  password?: string;
  inviterId?: string;
  semData?: SemData;
  bdVid?: string;
}) => {
  let user: User | null = null;

  const _user = await globalPrisma.oauthProvider.findUnique({
    where: {
      providerId_providerType: {
        providerType: provider,
        providerId
      }
    }
  });
  if (provider === ProviderType.PASSWORD) {
    if (!password) {
      return null;
    }
    if (!_user) {
      if (!enableSignUp()) throw new Error('Failed to signUp user');
      const result = await signUpByPassword({
        id: providerId,
        name,
        avatar_url,
        password,
        semData
      });
      result && (user = result.user);
      if (inviterId && result) {
        inviteHandler({
          inviterId: inviterId,
          inviteeId: result?.user.name,
          signResult: result
        });
      }
    } else {
      const result = await signInByPassword({
        id: providerId,
        password
      });
      // password is wrong
      if (!result) return null;
      user = result.user;
    }
  } else {
    if (!_user) {
      if (!enableSignUp()) throw new Error('Failed to signUp user');
      const result = await signUp({
        provider,
        id: providerId,
        name,
        avatar_url,
        semData
      });
      result && (user = result.user);
      if (inviterId && result) {
        inviteHandler({
          inviterId: inviterId,
          inviteeId: result?.user.name,
          signResult: result
        });
      }
      if (bdVid && result) {
        uploadConvertData({ newType: [3], bdVid })
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
      }
    } else {
      const result = await signIn({
        provider,
        id: providerId
      });
      result && (user = result.user);
    }
  }

  if (!user) throw new Error('Failed to edit db');

  const token = generateAuthenticationToken({
    userUid: user.uid,
    userId: user.name
  });

  return {
    token,
    user: {
      name: user.nickname,
      avatar: user.avatarUri,
      userUid: user.uid
    }
  };
};
