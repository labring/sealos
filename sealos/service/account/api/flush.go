package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	corev1 "k8s.io/api/core/v1"
	types2 "k8s.io/apimachinery/pkg/types"

	"sigs.k8s.io/controller-runtime/pkg/client"

	clt_log "sigs.k8s.io/controller-runtime/pkg/log"

	v1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"gorm.io/gorm"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	clt_log.SetLogger(zap.New(zap.WriteTo(os.Stdout), zap.UseDevMode(false)))
}

func AdminFlushDebtResourceStatus(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	req, err := helper.ParseAdminFlushDebtResourceStatusReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	owner, err := dao.DBClient.GetUserCrName(types.UserQueryOpts{UID: req.UserUID})
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user cr name: %v", err)})
		return
	}
	if owner == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	namespaces, err := getOwnNsListWithClt(dao.K8sManager.GetClient(), owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get own namespace list failed: %v", err)})
		return
	}
	if err = flushUserDebtResourceStatus(req, dao.K8sManager.GetClient(), namespaces); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to flush user resource status: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func flushUserDebtResourceStatus(req *helper.AdminFlushDebtResourceStatusReq, clt client.Client, namespaces []string) error {
	switch req.LastDebtStatus {
	case types.NormalPeriod, types.LowBalancePeriod, types.CriticalBalancePeriod:
		if types.StatusMap[req.CurrentDebtStatus] > types.StatusMap[req.LastDebtStatus] {
			//if err := r.sendDesktopNoticeAndSms(ctx, debt.Spec.UserName, oweamount, currentStatus, userNamespaceList, smsEnable, isBasicUser); err != nil {
			//	r.Logger.Error(err, fmt.Sprintf("send %s notice error", currentStatus))
			//}
			if err := SendDesktopNotice(context.Background(), clt, req, namespaces); err != nil {
				return fmt.Errorf("send desktop notice error: %w", err)
			}
		} else {
			if err := readNotice(context.Background(), clt, namespaces, getAllGtStatus(req.CurrentDebtStatus)...); err != nil {
				return fmt.Errorf("read notice error: %w", err)
			}
		}
		if types.ContainDebtStatus(types.DebtStates, req.CurrentDebtStatus) {
			//if err := r.SuspendUserResource(ctx, userNamespaceList); err != nil {
			//	return err
			//}
			if err := updateDebtNamespaceStatus(context.Background(), clt, SuspendDebtNamespaceAnnoStatus, namespaces); err != nil {
				return fmt.Errorf("update namespace status error: %w", err)
			}
		}
	case types.DebtPeriod, types.DebtDeletionPeriod, types.FinalDeletionPeriod: // The current status may be: (Normal, LowBalance, CriticalBalance) Period [Service needs to be restored], DebtDeletionPeriod [Service suspended]
		if types.ContainDebtStatus(types.NonDebtStates, req.CurrentDebtStatus) {
			// TODO flash all region resume user resource
			//if err := r.readNotice(ctx, userNamespaceList, debtStates...); err != nil {
			//	r.Logger.Error(err, "read low balance notice error")
			//}
			//if err := r.ResumeUserResource(ctx, userNamespaceList); err != nil {
			//	return err
			//}
			if err := readNotice(context.Background(), clt, namespaces, getAllGtStatus(req.CurrentDebtStatus)...); err != nil {
				return fmt.Errorf("read notice error: %w", err)
			}
			if err := updateDebtNamespaceStatus(context.Background(), clt, ResumeDebtNamespaceAnnoStatus, namespaces); err != nil {
				return fmt.Errorf("update namespace status error: %w", err)
			}
			break
		}
		if req.CurrentDebtStatus != types.FinalDeletionPeriod {
			//err = r.sendDesktopNoticeAndSms(ctx, debt.Spec.UserName, oweamount, currentStatus, userNamespaceList, smsEnable, isBasicUser)
			//if err != nil {
			//	r.Logger.Error(err, fmt.Sprintf("send %s notice error", currentStatus))
			//}
			//if err = r.SuspendUserResource(ctx, userNamespaceList); err != nil {
			//	return err
			//}
			if err := SendDesktopNotice(context.Background(), clt, req, namespaces); err != nil {
				return fmt.Errorf("send desktop notice error: %w", err)
			}
			if err := updateDebtNamespaceStatus(context.Background(), clt, SuspendDebtNamespaceAnnoStatus, namespaces); err != nil {
				return fmt.Errorf("update namespace status error: %w", err)
			}
		} else {
			//if err = r.DeleteUserResource(ctx, userNamespaceList); err != nil {
			//	return err
			//}
			if err := updateDebtNamespaceStatus(context.Background(), clt, FinalDeletionDebtNamespaceAnnoStatus, namespaces); err != nil {
				return fmt.Errorf("update namespace status error: %w", err)
			}
		}
	}
	return nil
}

func updateDebtNamespaceStatus(ctx context.Context, clt client.Client, status string, namespaces []string) error {
	return updateNamespaceStatus(ctx, clt, DebtNamespaceAnnoStatusKey, status, namespaces)
}

func updateNetworkNamespaceStatus(ctx context.Context, clt client.Client, status string, namespaces []string) error {
	return updateNamespaceStatus(ctx, clt, NetworkStatusAnnoKey, status, namespaces)
}

func updateNamespaceStatus(ctx context.Context, clt client.Client, annoKey, status string, namespaces []string) error {
	for i := range namespaces {
		ns := &corev1.Namespace{}
		if err := clt.Get(ctx, types2.NamespacedName{Name: namespaces[i]}, ns); err != nil {
			return err
		}
		if ns.Annotations[annoKey] == status {
			continue
		}

		original := ns.DeepCopy()
		ns.Annotations[annoKey] = status

		if err := clt.Patch(ctx, ns, client.MergeFrom(original)); err != nil {
			return fmt.Errorf("patch namespace annotation failed: %w", err)
		}
		//if err := clt.Update(ctx, ns); err != nil {
		//	return err
		//}
	}
	return nil
}

const (
	debtChoicePrefix = "debt-choice-"
	fromEn           = "Debt-System"
	fromZh           = "欠费系统"

	languageZh      = "zh"
	readStatusLabel = "isRead"
	falseStatus     = "false"
	trueStatus      = "true"
)
const (
	DebtNamespaceAnnoStatusKey = "debt.sealos/status"
	NetworkStatusAnnoKey       = "network.sealos.io/status"

	SuspendNetworkNamespaceAnnoStatus = "Suspend"
	ResumeNetworkNamespaceAnnoStatus  = "Resume"

	NormalDebtNamespaceAnnoStatus           = "Normal"
	SuspendDebtNamespaceAnnoStatus          = "Suspend"
	FinalDeletionDebtNamespaceAnnoStatus    = "FinalDeletion"
	ResumeDebtNamespaceAnnoStatus           = "Resume"
	TerminateSuspendDebtNamespaceAnnoStatus = "TerminateSuspend"
)

func SendDesktopNotice(ctx context.Context, clt client.Client, req *helper.AdminFlushDebtResourceStatusReq, namespaces []string) error {
	if req.IsBasicUser && req.CurrentDebtStatus != types.DebtPeriod && req.CurrentDebtStatus != types.DebtDeletionPeriod && req.CurrentDebtStatus != types.FinalDeletionPeriod && req.CurrentDebtStatus != types.CriticalBalancePeriod {
		return nil
	}
	if err := sendDesktopNotice(ctx, clt, req.CurrentDebtStatus, namespaces); err != nil {
		return fmt.Errorf("send notice error: %w", err)
	}
	return nil
}

func sendDesktopNotice(ctx context.Context, clt client.Client, noticeType types.DebtStatusType, namespaces []string) error {
	now := time.Now().UTC().Unix()
	ntfTmp := &v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name: debtChoicePrefix + strings.ToLower(string(noticeType)),
		},
	}
	ntfTmpSpc := v1.NotificationSpec{
		Title:        dao.TitleTemplateENMap[noticeType],
		Message:      dao.NoticeTemplateENMap[noticeType],
		From:         fromEn,
		Importance:   v1.High,
		DesktopPopup: true,
		Timestamp:    now,
		I18n: map[string]v1.I18n{
			languageZh: {
				Title:   dao.TitleTemplateZHMap[noticeType],
				From:    fromZh,
				Message: dao.NoticeTemplateZHMap[noticeType],
			},
		},
	}
	for i := range namespaces {
		ntf := ntfTmp.DeepCopy()
		ntfSpec := ntfTmpSpc.DeepCopy()
		ntf.Namespace = namespaces[i]
		if _, err := controllerutil.CreateOrUpdate(ctx, clt, ntf, func() error {
			ntf.Spec = *ntfSpec
			if ntf.Labels == nil {
				ntf.Labels = make(map[string]string)
			}
			ntf.Labels[readStatusLabel] = falseStatus
			return nil
		}); err != nil {
			return err
		}
	}
	return nil
}

func getAllGtStatus(currentStatus types.DebtStatusType) []types.DebtStatusType {
	lessStatus := make([]types.DebtStatusType, 0)
	for k, v := range types.StatusMap {
		if v > types.StatusMap[currentStatus] {
			lessStatus = append(lessStatus, k)
		}
	}
	return lessStatus
}

func readNotice(ctx context.Context, clt client.Client, namespaces []string, noticeTypes ...types.DebtStatusType) error {
	for i := range namespaces {
		for _, noticeStatus := range noticeTypes {
			ntf := &v1.Notification{}
			if err := clt.Get(ctx, types2.NamespacedName{Name: debtChoicePrefix + strings.ToLower(string(noticeStatus)), Namespace: namespaces[i]}, ntf); client.IgnoreNotFound(err) != nil {
				return err
			} else if err != nil {
				continue
			}
			if ntf.Labels == nil {
				ntf.Labels = make(map[string]string)
			} else if ntf.Labels[readStatusLabel] == trueStatus {
				continue
			}
			ntf.Labels[readStatusLabel] = trueStatus
			if err := clt.Update(ctx, ntf); err != nil {
				return err
			}
		}
	}
	return nil
}

func AdminFlushSubscriptionQuota(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	req, err := helper.ParseAdminFlushSubscriptionQuotaReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	owner, err := dao.DBClient.GetUserCrName(types.UserQueryOpts{UID: req.UserUID})
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user cr name: %v", err)})
		return
	}
	if owner == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	nsList, err := getOwnNsListWithClt(dao.K8sManager.GetClient(), owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get own namespace list failed: %v", err)})
		return
	}

	rs, ok := dao.SubPlanResourceQuota[req.PlanName]
	if !ok {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("plan name is not in plan resource quota: %v", req.PlanName)})
		return
	}
	for _, ns := range nsList {
		quota := getDefaultResourceQuota(ns, "quota-"+ns, rs)
		hard := quota.Spec.Hard.DeepCopy()
		_, err = controllerutil.CreateOrUpdate(context.Background(), dao.K8sManager.GetClient(), quota, func() error {
			quota.Spec.Hard = hard
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("update resource quota failed: %v", err)})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// FlushSubscriptionQuota
// @Summary flush user quota with subscription
// @Description flush user quota with subscription
// @Tags Subscription
// @Accept json
// @Produce json
// @Success 200 {object} SubscriptionFlushQuotaResp
// @Router /payment/v1alpha1/subscription/flush-quota [post]
func FlushSubscriptionQuota(c *gin.Context) {
	// 初始化日志前的时间点
	startTime := time.Now().UTC()
	lastTime := startTime

	// 定义一个辅助函数来记录时间间隔并更新lastTime
	logWithDuration := func(message string) {
		now := time.Now().UTC()
		duration := now.Sub(lastTime)
		log.Printf("%s (took %v since last step, %v since start)", message, duration, now.Sub(startTime))
		lastTime = now
	}

	logWithDuration("Starting FlushSubscriptionQuota")

	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error: %v", err)})
		return
	}
	logWithDuration("Authentication completed")

	if req.Owner == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		logWithDuration("Request completed early due to empty owner")
		return
	}

	nsList, err := getOwnNsListWithClt(dao.K8sManager.GetClient(), req.Owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get own namespace list failed: %v", err)})
		return
	}
	logWithDuration(fmt.Sprintf("Retrieved namespace list: %v", nsList))

	userSub, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get user subscription failed: %v", err)})
		return
	}
	logWithDuration("User subscription retrieved")

	for _, ns := range nsList {
		logWithDuration(fmt.Sprintf("Starting quota flush for namespace: %s", ns))

		quota := getDefaultResourceQuota(ns, "quota-"+ns, dao.SubPlanResourceQuota[userSub.PlanName])
		err = Retry(2, time.Second, func() error {
			fErr := dao.K8sManager.GetClient().Update(context.Background(), quota)
			if err != nil {
				log.Printf("Failed to update resource quota for %s: %v", ns, fErr)
				return fmt.Errorf("failed to update resource quota for %s: %w", ns, fErr)
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("update resource quota failed: %v", err)})
			return
		}
		logWithDuration(fmt.Sprintf("Quota updated for namespace: %s", ns))
	}

	logWithDuration("FlushSubscriptionQuota completed")
	c.JSON(http.StatusOK, gin.H{"success": true})
}
