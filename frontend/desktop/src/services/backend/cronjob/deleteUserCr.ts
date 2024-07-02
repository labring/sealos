import { setUserDelete } from '../kubernetes/admin';
import { globalPrisma, prisma } from '../db/init';
import { TransactionStatus, TransactionType } from 'prisma/global/generated/client';
import { CronJobStatus } from '@/services/backend/cronjob/index';

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
    const userCr = await prisma.userCr.findUnique({
      where: { userUid }
    });
    if (!userCr) {
      return;
      // throw new Error('the userCR not found');
    }
    const deleteResult = await setUserDelete(userCr.crName);

    if (!deleteResult) {
      throw new Error(`delete User not Success`);
    }
    prisma.userWorkspace.deleteMany({
      where: {
        userCrUid: userCr.uid
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
