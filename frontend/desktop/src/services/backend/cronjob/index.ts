import { globalPrisma } from '../db/init';
import {
  TransactionStatus,
  TransactionType,
  Prisma as GlobalPrisma
} from 'prisma/global/generated/client';
import { getRegionUid } from '@/services/enable';
import dayjs from 'dayjs';
import { DeleteUserCrJob } from '@/services/backend/cronjob/deleteUserCr';
import { Prisma } from '@prisma/client/extension';
import { MergeUserCrJob } from '@/services/backend/cronjob/mergeUserCr';

export type CronJobStatus = {
  unit: (infoUid: string, transactionUid: string) => Promise<void>;
  canCommit: () => boolean;
  transactionType: TransactionType;
  COMMIT_TIMEOUT: number;
  commit: () => Promise<void>;
};
const TIMEOUT = 5000;
const getJob = (
  transaction: Prisma.Result<
    typeof globalPrisma.precommitTransaction,
    GlobalPrisma.PrecommitTransactionDefaultArgs,
    'findFirst'
  >
) => {
  if (!transaction) return null;
  if (transaction.transactionType === TransactionType.DELETE_USER) {
    return new DeleteUserCrJob(transaction.uid, transaction.infoUid);
  } else if (transaction.transactionType === TransactionType.MERGE_USER) {
    return new MergeUserCrJob(transaction.uid, transaction.infoUid);
  } else {
    return null;
  }
};
// ready=>running
// handle one Task per tick
export const runTransactionjob = async () => {
  // console.log('run transactionjob', new Date());
  const regionUid = getRegionUid();
  let isTimeoutTransactionDetail = false;
  // find task
  let transactionDetail = await globalPrisma.transactionDetail.findFirst({
    where: {
      regionUid,
      status: TransactionStatus.READY
    },
    include: {
      precommitTransaction: true
    },
    orderBy: {
      updatedAt: 'asc'
    }
  });
  if (!transactionDetail) {
    transactionDetail = await globalPrisma.transactionDetail.findFirst({
      where: {
        regionUid,
        //  death lock
        status: TransactionStatus.RUNNING,
        updatedAt: {
          lte: dayjs().subtract(TIMEOUT, 'ms').toDate()
        }
      },
      orderBy: {
        updatedAt: 'asc'
      },
      include: {
        precommitTransaction: true
      }
    });
    isTimeoutTransactionDetail = true;
  }
  // not found task
  if (!transactionDetail) {
    return;
  }
  const transaction = transactionDetail.precommitTransaction;

  const job = getJob(transaction);
  if (!job) return;

  // startingRunning
  if (
    transaction.status === TransactionStatus.RUNNING ||
    transaction.status === TransactionStatus.READY
  ) {
    if (isTimeoutTransactionDetail) {
      await globalPrisma.$transaction([
        // make sure it is not running
        globalPrisma.transactionDetail.findUniqueOrThrow({
          where: {
            uid: transactionDetail.uid,
            updatedAt: {
              lte: dayjs().subtract(TIMEOUT, 'ms').toDate()
            }
          }
        }),
        globalPrisma.transactionDetail.update({
          where: {
            uid: transactionDetail.uid,
            status: TransactionStatus.RUNNING
          },
          data: {
            status: TransactionStatus.RUNNING
          }
        })
      ]);
    } else {
      await globalPrisma.$transaction([
        globalPrisma.transactionDetail.findUniqueOrThrow({
          where: {
            uid: transactionDetail.uid,
            status: TransactionStatus.READY
          }
        }),
        globalPrisma.transactionDetail.update({
          where: {
            uid: transactionDetail.uid,
            status: TransactionStatus.READY
          },
          data: {
            status: TransactionStatus.RUNNING
          }
        })
      ]);
    }
  } else {
    return;
  }
  // try {
  await job.unit();
  await globalPrisma.transactionDetail.update({
    where: {
      uid: transactionDetail.uid,
      status: TransactionStatus.RUNNING
    },
    data: {
      status: TransactionStatus.FINISH
    }
  });
};

// running => finish or error
export const finishTransactionJob = async () => {
  // console.log('finish transactionjob', new Date());
  const regionList = await globalPrisma.region.findMany({});
  const transactionList = await globalPrisma.precommitTransaction.findMany({
    where: {
      status: {
        in: [TransactionStatus.RUNNING, TransactionStatus.READY]
      }
    },
    include: {
      transactionDetail: {
        select: {
          status: true,
          regionUid: true
        }
      }
    }
  });
  const needFinishTransactionList = transactionList
    .filter((tx) => {
      const finishList = tx.transactionDetail.filter((d) => d.status === TransactionStatus.FINISH);
      return regionList.every(({ uid }) => finishList.findIndex((f) => f.regionUid === uid) >= 0);
    })
    .map((tx) => tx.uid);
  if (!needFinishTransactionList) return;

  await globalPrisma.precommitTransaction.updateMany({
    where: {
      status: {
        in: [TransactionStatus.RUNNING, TransactionStatus.READY]
      },
      uid: {
        in: needFinishTransactionList
      }
    },
    data: {
      status: TransactionStatus.FINISH
    }
  });
};

// finish => commited
export const commitTransactionjob = async () => {
  // console.log('commit transactionjob', new Date());
  const unCommitedTransaction = await globalPrisma.precommitTransaction.findFirst({
    where: {
      status: TransactionStatus.FINISH,
      commitTransactionSet: null
    },
    orderBy: {
      updatedAt: 'asc'
    }
  });
  if (!unCommitedTransaction) return;
  const job = getJob(unCommitedTransaction);
  if (!job) return;
  // if timeout, mark error
  const currentTime = new Date().getTime();
  // the record will be updated when status is updated
  if (currentTime - unCommitedTransaction.updatedAt.getTime() > job.COMMIT_TIMEOUT) {
    await globalPrisma.$transaction([
      globalPrisma.commitTransactionSet.create({
        data: {
          precommitTransactionUid: unCommitedTransaction.uid
        }
      }),
      globalPrisma.precommitTransaction.findUniqueOrThrow({
        where: {
          uid: unCommitedTransaction.uid,
          status: TransactionStatus.FINISH
        }
      }),
      globalPrisma.precommitTransaction.update({
        where: {
          uid: unCommitedTransaction.uid,
          status: TransactionStatus.FINISH
        },
        data: {
          status: TransactionStatus.ERROR
        }
      }),
      globalPrisma.errorPreCommitTransaction.create({
        data: {
          transactionUid: unCommitedTransaction.uid,
          reason: 'commit timeout'
        }
      })
    ]);
    return;
  }
  const canCommit = job.canCommit();
  if (!canCommit) return;
  else await job.commit();
};
