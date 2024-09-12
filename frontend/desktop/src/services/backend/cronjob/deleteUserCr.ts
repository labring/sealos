import { CronJobStatus } from '@/services/backend/cronjob/index';
import { getRegionUid } from '@/services/enable';
import { DeleteUserEvent } from '@/types/db/event';
import { TransactionStatus, TransactionType } from 'prisma/global/generated/client';
import { Role } from 'prisma/region/generated/client';
import { globalPrisma, prisma } from '../db/init';
import { setUserDelete, setUserWorkspaceLock as setWorkspaceLock } from '../kubernetes/admin';

export class DeleteUserCrJob implements CronJobStatus {
  private userUid = '';
  transactionType = TransactionType.DELETE_USER;
  UNIT_TIMEOUT = 3000;
  COMMIT_TIMEOUT = 30000;
  constructor(private transactionUid: string, private infoUid: string) {}
  async init() {
    const infoUid = this.infoUid;
    const info = await globalPrisma.deleteUserTransactionInfo.findUnique({
      where: {
        uid: infoUid
      }
    });
    if (!info) throw new Error('the transaction info not found');

    this.userUid = info.userUid;
  }
  async unit() {
    await this.init();
    const userUid = this.userUid;
    // lock owner workspace
    const userCr = await prisma.userCr.findUnique({
      where: { userUid },
      include: {
        userWorkspace: {
          include: {
            workspace: true
          }
        }
      }
    });
    if (!userCr) {
      await globalPrisma.eventLog.create({
        data: {
          eventName: DeleteUserEvent['<DELETE_USER>_DELETE_USERCR'],
          mainId: userUid,
          data: JSON.stringify({
            userUid,
            regionUid: getRegionUid(),
            message: `Because the userCR is not found, deleting user success`
          })
        }
      });
      return;
      // throw new Error('the userCR not found');
    } // lock owner workspace
    const workspaceList = userCr.userWorkspace
      .filter((item) => item.role === Role.OWNER)
      .map((item) => item.workspace);
    await Promise.all(
      workspaceList.map(async (workspace) => {
        await setWorkspaceLock(workspace.id);
        // kick out all user workspace except owner
        await prisma.userWorkspace.deleteMany({
          where: {
            workspaceUid: workspace.uid,
            role: {
              not: Role.OWNER
            }
          }
        });
        await globalPrisma.eventLog.create({
          data: {
            eventName: DeleteUserEvent['<DELETE_USER>_SET_LOCK_WORKSPACE'],
            mainId: userUid,
            data: JSON.stringify({
              userUid,
              userCrName: userCr.crName,
              workspaceId: workspace.id,
              regionUid: getRegionUid(),
              message: `delete user success`
            })
          }
        });
      })
    );

    // kick off self from other workspace, igonre rolebinding
    const clearResult = await prisma.userWorkspace.deleteMany({
      where: {
        userCrUid: userCr.uid,
        role: {
          not: Role.OWNER
        }
      }
    });

    const deleteResult = await setUserDelete(userCr.crName);

    if (!deleteResult) {
      throw new Error(`delete User not Success`);
    }
    await globalPrisma.eventLog.create({
      data: {
        eventName: DeleteUserEvent['<DELETE_USER>_DELETE_USERCR'],
        mainId: userUid,
        data: JSON.stringify({
          userUid,
          regionUid: getRegionUid(),
          message: `delete user success`
        })
      }
    });
  }
  canCommit() {
    return true;
  }
  async commit() {
    await this.init();
    const userUid = this.userUid;
    if (!userUid) throw Error('uid not found');
    await globalPrisma.$transaction([
      globalPrisma.commitTransactionSet.create({
        data: {
          precommitTransactionUid: this.transactionUid
        }
      }),
      globalPrisma.deleteUserLog.create({
        data: {
          userUid
        }
      }),
      globalPrisma.eventLog.create({
        data: {
          eventName: DeleteUserEvent['<DELETE_USER>_COMMIT'],
          mainId: userUid,
          data: JSON.stringify({
            userUid,
            message: `delete user success`
          })
        }
      }),
      globalPrisma.precommitTransaction.findUniqueOrThrow({
        where: {
          uid: this.transactionUid,
          status: TransactionStatus.FINISH
        }
      }),
      globalPrisma.precommitTransaction.update({
        where: {
          uid: this.transactionUid,
          status: TransactionStatus.FINISH
        },
        data: {
          status: TransactionStatus.COMMITED
        }
      })
    ]);
  }
}
