import { uploadConvertData } from '@/api/platform';
import { generateAuthenticationToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
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
import { enableSignUp, enableTracking } from '../enable';
import { trackSignUp } from './tracking';

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

      await createNewUserTasks(tx, user.uid);

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
      if (!!result) {
        user = result.user;
        if (inviterId && result) {
          inviteHandler({
            inviterId: inviterId,
            inviteeId: result?.user.name,
            signResult: result
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
      if (result) {
        user = result.user;
        if (inviterId) {
          inviteHandler({
            inviterId: inviterId,
            inviteeId: result?.user.name,
            signResult: result
          });
        }
        if (bdVid) {
          await uploadConvertData({ newType: [3], bdVid })
            .then((res) => {
              console.log(res);
            })
            .catch((err) => {
              console.log(err);
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
      const result = await signIn({
        provider,
        id: providerId
      });
      result && (user = result.user);
    }
  }
  if (!user) throw new Error('Failed to edit db');
  // user is deleted or banned
  if (user.status !== UserStatus.NORMAL_USER) return null;
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
