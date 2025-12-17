import { uploadConvertData } from '@/api/platform';
import { generateAuthenticationToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { AuthError } from '@/services/backend/errors';
import { AuthConfigType } from '@/types';
import { SemData } from '@/types/sem';
import { hashPassword } from '@/utils/crypto';
import { nanoid } from 'nanoid';
import {
  PrismaClient,
  ProviderType,
  TaskStatus,
  User,
  UserStatus
} from 'prisma/global/generated/client';
import { enableSignUp, enableTracking, getRegionUid, getVersion } from '../enable';
import { trackSignUp } from './tracking';
import { emit } from 'process';
import { addOauthProvider, bindEmailSvc } from './svc/bindProvider';
import { AdClickData } from '@/types/adClick';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

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

  await checkDeductionBalanceAndCreateTasks(userProvider.user.uid);

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

  await checkDeductionBalanceAndCreateTasks(userProvider.user.uid);

  return {
    user: userProvider.user
  };
}

/**
 * Checks the deduction balance of a user and creates new tasks if the balance is zero.
 *
 * @param {string} userUid - The unique identifier of the user.
 */
async function checkDeductionBalanceAndCreateTasks(userUid: string) {
  const account = await globalPrisma.account.findUnique({
    where: { userUid }
  });

  // Check if the account exists, the deduction balance is not null, and the balance is zero.
  if (
    account &&
    account.deduction_balance !== null &&
    account.deduction_balance.toString() === '0'
  ) {
    const userTasks = await globalPrisma.userTask.findFirst({
      where: { userUid }
    });

    // If no user tasks are found, create new tasks for the user.
    if (!userTasks) {
      await globalPrisma.$transaction(async (tx) => {
        await createNewUserTasks(tx, userUid);
      });
    }
  }
}

// Assign tasks to newly registered users
async function createNewUserTasks(tx: TransactionClient, userUid: string) {
  const newUserTasks = await tx.task.findMany({
    where: {
      isActive: true
    }
  });

  for (const task of newUserTasks) {
    await tx.userTask.create({
      data: {
        userUid,
        taskId: task.id,
        status: TaskStatus.NOT_COMPLETED,
        rewardStatus: task.taskType === 'DESKTOP' ? TaskStatus.COMPLETED : TaskStatus.NOT_COMPLETED,
        completedAt: new Date(0)
      }
    });
  }
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
          },
          userInfo: {
            create: {
              signUpRegionUid: getRegionUid(),
              isInited: false
            }
          }
        }
      });

      if (semData?.channel) {
        await tx.userSemChannel.create({
          data: {
            userUid: user.uid,
            channel: semData.channel,
            additionalInfo: semData.additionalInfo
          }
        });
      }

      await createNewUserTasks(tx, user.uid);

      return { user };
    });

    return result;
  } catch (error) {
    console.error('globalAuth: Error during sign up:', error);
    return null;
  }
}
async function signUpWithEmail({
  provider,
  id,
  name: nickname,
  avatar_url,
  semData,
  email
}: {
  provider: ProviderType;
  id: string;
  name: string;
  avatar_url: string;
  semData?: SemData;
  email: string;
}) {
  const name = nanoid(10);
  try {
    const user = await globalPrisma.$transaction(async (tx) => {
      const user: User = await tx.user.create({
        data: {
          name: name,
          id: name,
          nickname: nickname,
          avatarUri: avatar_url,
          oauthProvider: {
            create: {
              providerId: email,
              providerType: 'EMAIL'
            }
          },
          userInfo: {
            create: {
              signUpRegionUid: getRegionUid(),
              isInited: false
            }
          }
        }
      });
      await tx.oauthProvider.create({
        data: {
          providerId: id,
          providerType: provider,
          userUid: user.uid
        }
      });
      if (semData?.channel) {
        await tx.userSemChannel.create({
          data: {
            userUid: user.uid,
            channel: semData.channel,
            additionalInfo: semData.additionalInfo
          }
        });
      }

      await createNewUserTasks(tx, user.uid);

      return user;
    });

    return { user };
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
          },
          userInfo: {
            create: {
              signUpRegionUid: getRegionUid(),
              isInited: false
            }
          }
        }
      });

      if (semData?.channel) {
        await tx.userSemChannel.create({
          data: {
            userUid: user.uid,
            channel: semData.channel,
            additionalInfo: semData.additionalInfo
          }
        });
      }

      await createNewUserTasks(tx, user.uid);

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
const forceBindEmail = (provider: ProviderType) =>
  getVersion() === 'en' && (provider === ProviderType.GOOGLE || provider === ProviderType.GITHUB);
export const getGlobalToken = async ({
  provider,
  providerId,
  name,
  email,
  avatar_url,
  password,
  inviterId,
  semData,
  adClickData
}: {
  provider: ProviderType;
  providerId: string;
  name: string;
  email?: string;
  avatar_url: string;
  password?: string;
  inviterId?: string;
  semData?: SemData;
  adClickData?: AdClickData;
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

  if (_user) {
    const find = await globalPrisma.restrictedUser.findFirst({
      where: {
        userUid: _user.userUid
      }
    });
    if (find) {
      return {
        token: null,
        isRestricted: true
      };
    }
  }

  if (provider === ProviderType.PASSWORD) {
    if (!password) {
      return null;
    }
    if (!_user) {
      throw new AuthError('User not found.', 'USER_NOT_FOUND');
    } else {
      const result = await signInByPassword({
        id: providerId,
        password
      });
      // password is wrong
      if (!result) {
        throw new AuthError('Incorrect password.', 'INCORRECT_PASSWORD');
      }
      user = result.user;
    }
  } else {
    if (!_user) {
      // sign up
      if (!enableSignUp()) throw new AuthError('Failed to signUp user', 'SIGNUP_FAILED');
      let signUpResult;
      if (forceBindEmail(provider)) {
        // check email
        if (!email) {
          console.log('Email is required');
          return null;
        }
        const emailUser = await globalPrisma.oauthProvider.findUnique({
          where: {
            providerId_providerType: {
              providerType: ProviderType.EMAIL,
              providerId: email
            }
          }
        });
        if (!!emailUser) {
          return {
            error: 'OAUTH_PROVIDER_CONFLICT'
          };
        }
        signUpResult = await signUpWithEmail({
          provider,
          id: providerId,
          name,
          avatar_url,
          semData,
          email
        });
      } else {
        signUpResult = await signUp({
          provider,
          id: providerId,
          name,
          avatar_url,
          semData
        });
      }

      if (signUpResult) {
        const result = signUpResult;
        user = result.user;
        if (inviterId) {
          inviteHandler({
            inviterId: inviterId,
            inviteeId: result.user.name,
            signResult: result
          });
        }
        if (adClickData) {
          await uploadConvertData(adClickData).catch((e) => {
            console.log('Failed to upload AD click data: ', e);
          });
        }
        if (enableTracking()) {
          await trackSignUp({
            userId: result.user.id,
            userUid: result.user.uid
          });
        }
      }
    } else {
      //signin
      const result = await signIn({
        provider,
        id: providerId
      });

      result && (user = result.user);
    }
  }
  if (!user) throw new AuthError('Failed to edit db', 'DATABASE_ERROR');

  if (!forceBindEmail(provider) && email) {
    try {
      const emailProvider = await globalPrisma.oauthProvider.findFirst({
        where: {
          providerType: ProviderType.EMAIL,
          userUid: user.uid
        }
      });
      if (!emailProvider) {
        await addOauthProvider({
          providerType: ProviderType.EMAIL,
          providerId: email,
          userUid: user.uid
        });
      }
    } catch (error) {
      console.error('globalAuth: Error during sign in bind email:', error);
    }
  }

  // user is deleted or banned
  if (user.status !== UserStatus.NORMAL_USER) return null;
  const token = generateAuthenticationToken({
    userUid: user.uid,
    userId: user.name
  });
  const userInfo = await globalPrisma.userInfo.findUnique({
    where: {
      userUid: user.uid
    },
    select: {
      isInited: true
    }
  });
  let needInit = userInfo ? !userInfo.isInited : false;
  return {
    token,
    user: {
      name: user.nickname,
      avatar: user.avatarUri,
      userUid: user.uid
    },
    needInit
  };
};
