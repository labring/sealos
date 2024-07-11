import { globalPrisma, prisma } from '../db/init';
import { TransactionStatus, TransactionType } from 'prisma/global/generated/client';
import { JoinStatus } from 'prisma/region/generated/client';
import { getBillingUrl, getCvmUrl, getRegionUid, getWorkorderUrl } from '@/services/enable';
import { CronJobStatus } from '@/services/backend/cronjob/index';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { mergeUserModifyBinding, mergeUserWorkspaceRole } from '@/services/backend/team';
import axios from 'axios';
import { generateCronJobToken } from '../auth';
import { MergeUserEvent } from '@/types/db/event';

/**
 * |											|	user is exist | user is not exist 			|
 * |mergeUser is exist 		|	merge					|	update mereUser to user	|
 * |mergeUser is not exist| return ok			|			return ok						|
 */
export class MergeUserCrJob implements CronJobStatus {
  private mergeUserUid = '';
  private userUid: string = '';
  UNIT_TIMEOUT = 3000;
  COMMIT_TIMEOUT = 60000;
  transactionType = TransactionType.MERGE_USER;
  constructor(private transactionUid: string, private infoUid: string) {}
  async init() {
    const info = await globalPrisma.mergeUserTransactionInfo.findUnique({
      where: {
        uid: this.infoUid
      }
    });
    if (!info) throw new Error('the transaction info not found');
    const { mergeUserUid, userUid } = info;
    this.mergeUserUid = mergeUserUid;
    this.userUid = userUid;
  }
  async unit() {
    await this.init();
    const mergeUserUid = this.mergeUserUid;
    const userUid = this.userUid;
    const mergeUserCr = await prisma.userCr.findUnique({
      where: { userUid: mergeUserUid }
    });

    if (!mergeUserCr) {
      // the mergeUser is not exist in the current region
      await globalPrisma.eventLog.create({
        data: {
          eventName: MergeUserEvent['<MERGE_USER>_MERGE_WORKSPACE'],
          mainId: userUid,
          data: JSON.stringify({
            mergeUserUid,
            userUid,
            regionUid: getRegionUid(),
            message: `Because the mergeUserCR is not found, merge workspace success`
          })
        }
      });
      return;
      // throw new Error('the mergeUserCR is not found');
    }
    const userCr = await prisma.userCr.findUnique({
      where: { userUid }
    });
    if (!userCr) {
      // the user is not exist in the current region
      // throw new Error('the userCR is not found');
      await prisma.userCr.update({
        where: {
          userUid: mergeUserUid
        },
        data: {
          userUid
        }
      });
      await globalPrisma.eventLog.create({
        data: {
          eventName: MergeUserEvent['<MERGE_USER>_MERGE_WORKSPACE'],
          mainId: userUid,
          data: JSON.stringify({
            mergeUserUid,
            userUid,
            regionUid: getRegionUid(),
            message: `Because the userCR is not found, merge workspace success`
          })
        }
      });
    } else {
      const [userWorkspaceList, mergeUserWorkspaceList] = await prisma.$transaction([
        prisma.userWorkspace.findMany({
          where: {
            userCrUid: userCr.uid,
            status: JoinStatus.IN_WORKSPACE
          }
        }),
        prisma.userWorkspace.findMany({
          where: {
            userCrUid: mergeUserCr.uid,
            status: JoinStatus.IN_WORKSPACE
          },
          include: {
            workspace: {
              select: {
                id: true
              }
            }
          }
        })
      ]);
      // modify role
      await Promise.all(
        mergeUserWorkspaceList.map(async ({ role: mergeUserRole, workspaceUid, workspace }) => {
          try {
            const userWorkspace = userWorkspaceList.find((r) => r.workspaceUid === workspaceUid);
            await globalPrisma.eventLog.create({
              data: {
                eventName: MergeUserEvent['<MERGE_USER>_MERGE_WORKSPACE'],
                mainId: userUid,
                data: JSON.stringify({
                  mergeUserCrName: mergeUserCr.crName,
                  userCrName: userCr.crName,
                  workspaceId: workspace.id,
                  userUid,
                  mergeUserUid,
                  mergeUserRole,
                  regionUid: getRegionUid(),
                  userRole: userWorkspace?.role,
                  message: `merge workspace`
                })
              }
            });
            // modify k8s resource, the handle is idempotent
            await mergeUserWorkspaceRole({
              mergeUserRole,
              userRole: userWorkspace?.role,
              workspaceId: workspace.id,
              mergeUserCrName: mergeUserCr.crName,
              userCrName: userCr.crName
            });
            // modify db resource
            await mergeUserModifyBinding({
              mergeUserCrUid: mergeUserCr.uid,
              mergeUserRole,
              userCrUid: userCr.uid,
              workspaceUid,
              userRole: userWorkspace?.role
            });
          } catch (err: any) {
            console.error(err);
          }
        })
      );
    }
  }
  canCommit() {
    const baseBillingUrl = getBillingUrl();
    const baseWorkorderUrl = getWorkorderUrl();
    const baseCvmUrl = getCvmUrl();
    return !!baseBillingUrl && !!baseCvmUrl && !!baseWorkorderUrl;
  }
  async commit() {
    await this.init();
    const mergeUserUid = this.mergeUserUid;
    const userUid = this.userUid;
    if (!mergeUserUid || !userUid) throw Error('uid not found');
    const baseBillingUrl = getBillingUrl();
    const baseWorkorderUrl = getWorkorderUrl();
    const baseCvmUrl = getCvmUrl();
    const billingUrl = baseBillingUrl + '/account/v1alpha1/transfer';
    const workorderUrl = baseWorkorderUrl + '/api/v1/migrate';
    const cvmUrl = baseCvmUrl + '/action/sealos-account-merge';
    // transfer
    const [user, mergeUser] = await globalPrisma.$transaction([
      globalPrisma.user.findUniqueOrThrow({ where: { uid: userUid } }),
      globalPrisma.user.findUniqueOrThrow({ where: { uid: mergeUserUid } })
    ]);
    let finalUserCr = await prisma.userCr.findUnique({
      where: {
        userUid: mergeUser.uid
      }
    });
    if (!finalUserCr) {
      finalUserCr = await prisma.userCr.findUnique({
        where: {
          userUid
        }
      });
      if (!finalUserCr) {
        throw Error('the userCr is not exist');
      }
    }
    const kubeConfig = await getUserKubeconfigNotPatch(finalUserCr.crName);
    if (!kubeConfig) throw Error('the kubeconfig for ' + finalUserCr.crName + ' is not found');
    const [transferResult, workorderResult, cvmResult] = await Promise.all([
      axios.post(billingUrl, {
        kubeConfig,
        owner: finalUserCr.crName,
        userid: mergeUser.id,
        toUser: user.id,
        transferAll: true
      }),
      axios.post(workorderUrl, {
        token: generateCronJobToken({
          userUid: user.id,
          mergeUserUid: mergeUser.id
        })
      }),
      axios.post(cvmUrl, {
        token: generateCronJobToken({
          userUid: user.uid,
          mergeUserUid: mergeUser.uid
        })
      })
    ]);
    const transferMergeSuccess = transferResult && transferResult.status === 200;
    const workorderMergeSuccess =
      workorderResult && workorderResult.status === 200 && workorderResult.data.code === 200;
    const cvmMergeSuccess = cvmResult && cvmResult.status === 200 && cvmResult.data.data === 'ok';
    if (!transferMergeSuccess || !workorderMergeSuccess || !cvmMergeSuccess) {
      throw new Error('commit Error');
    }
    await globalPrisma.$transaction([
      globalPrisma.commitTransactionSet.create({
        data: {
          precommitTransactionUid: this.transactionUid
        }
      }),
      globalPrisma.deleteUserLog.create({
        data: {
          userUid: mergeUserUid
        }
      }),
      globalPrisma.eventLog.create({
        data: {
          eventName: MergeUserEvent['<MERGE_USER>_COMMIT'],
          mainId: this.userUid,
          data: JSON.stringify({
            userUid,
            mergeUserUid,
            regionUid: getRegionUid(),
            message: `from ${mergeUser.id} to ${user.id}, 
							merge workorder, cloud vm and balance success`
          })
        }
      }),
      globalPrisma.precommitTransaction.update({
        where: {
          uid: this.transactionUid
        },
        data: {
          status: TransactionStatus.COMMITED
        }
      })
    ]);
  }
}
