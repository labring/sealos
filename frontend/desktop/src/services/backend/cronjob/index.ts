import { DeleteUserCrJob } from '@/services/backend/cronjob/deleteUserCr';
import { MergeUserCrJob } from '@/services/backend/cronjob/mergeUserCr';
import { getRegionUid } from '@/services/enable';
import { Prisma } from '@prisma/client/extension';
import dayjs from 'dayjs';
import {
  Prisma as GlobalPrisma,
  TransactionStatus,
  TransactionType
} from 'prisma/global/generated/client';
import { globalPrisma } from '../db/init';

export type CronJobStatus = {
  unit: (infoUid: string, transactionUid: string) => Promise<void>;
  canCommit: () => boolean;
  transactionType: TransactionType;
  COMMIT_TIMEOUT: number;
  commit: () => Promise<void>;
};
const TIMEOUT = 5000;
const RUNNABLE_TRANSACTION_STATUSES = [TransactionStatus.READY, TransactionStatus.RUNNING];

const getRunnableTransactionUidList = async () => {
  const transactions = await globalPrisma.precommitTransaction.findMany({
    where: {
      status: {
        in: RUNNABLE_TRANSACTION_STATUSES
      }
    },
    select: {
      uid: true
    }
  });
  return transactions.map(({ uid }) => uid);
};

const findRunnableTransactionDetail = async ({
  regionUid,
  status,
  transactionUidList,
  updatedAt
}: {
  regionUid: string;
  status: TransactionStatus;
  transactionUidList: string[];
  updatedAt?: {
    lte: Date;
  };
}) => {
  if (transactionUidList.length === 0) return null;

  return globalPrisma.transactionDetail.findFirst({
    where: {
      regionUid,
      status,
      transactionUid: {
        in: transactionUidList
      },
      ...(updatedAt ? { updatedAt } : {})
    },
    orderBy: {
      updatedAt: 'asc'
    }
  });
};

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
  const runnableTransactionUidList = await getRunnableTransactionUidList();
  // find task
  let transactionDetail = await findRunnableTransactionDetail({
    regionUid,
    status: TransactionStatus.READY,
    transactionUidList: runnableTransactionUidList
  });
  if (!transactionDetail) {
    transactionDetail = await findRunnableTransactionDetail({
      regionUid,
      //  death lock
      status: TransactionStatus.RUNNING,
      updatedAt: {
        lte: dayjs().subtract(TIMEOUT, 'ms').toDate()
      },
      transactionUidList: runnableTransactionUidList
    });
    isTimeoutTransactionDetail = true;
  }
  // not found task
  if (!transactionDetail) {
    return;
  }
  const transaction = await globalPrisma.precommitTransaction.findUnique({
    where: {
      uid: transactionDetail.transactionUid
    }
  });
  if (!transaction) return;

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
  await job.unit();
  const latestTransaction = await globalPrisma.precommitTransaction.findUnique({
    where: {
      uid: transactionDetail.transactionUid
    },
    select: {
      status: true
    }
  });
  await globalPrisma.transactionDetail.update({
    where: {
      uid: transactionDetail.uid,
      status: TransactionStatus.RUNNING
    },
    data: {
      status:
        latestTransaction?.status === TransactionStatus.ERROR
          ? TransactionStatus.ERROR
          : TransactionStatus.FINISH
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
        in: RUNNABLE_TRANSACTION_STATUSES
      }
    },
    select: {
      uid: true
    }
  });
  const transactionUidList = transactionList.map(({ uid }) => uid);
  if (transactionUidList.length === 0) return;

  const transactionDetailList = await globalPrisma.transactionDetail.findMany({
    where: {
      transactionUid: {
        in: transactionUidList
      }
    },
    select: {
      status: true,
      regionUid: true,
      transactionUid: true
    }
  });
  const transactionDetailMap = transactionDetailList.reduce<
    Record<string, { status: TransactionStatus; regionUid: string }[]>
  >((acc, detail) => {
    acc[detail.transactionUid] = acc[detail.transactionUid] ?? [];
    acc[detail.transactionUid].push(detail);
    return acc;
  }, {});
  const needFinishTransactionList = transactionList
    .filter((tx) => {
      const finishList = (transactionDetailMap[tx.uid] ?? []).filter(
        (d) => d.status === TransactionStatus.FINISH
      );
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
