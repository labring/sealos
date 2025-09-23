package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/labring/sealos/controllers/pkg/types"

	v1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/labring/sealos/service/account/dao"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/helper"
)

func authenticateWorkspaceRequest(c *gin.Context, req *helper.WorkspaceInfoReq) error {
	if err := authenticateRequest(c, req); err != nil {
		return fmt.Errorf("authenticate error : %v", err)
	}
	role, err := dao.DBClient.GetUserWorkspaceRole(req.UserUID, req.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get user role: %v", err)
	}
	if role == "" {
		return fmt.Errorf("there is no permission find this workspace")
	}
	return nil
}

func authenticateWorkspaceSubscriptionRequest(c *gin.Context, req *helper.WorkspaceSubscriptionInfoReq, isOwner bool) error {
	if err := authenticateRequest(c, req); err != nil {
		return fmt.Errorf("authenticate error : %v", err)
	}
	role, err := dao.DBClient.GetUserWorkspaceRole(req.UserUID, req.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get user role: %v", err)
	}
	if role == "" || (isOwner && role != types.RoleOwner) {
		return fmt.Errorf("there is no permission find this workspace")
	}
	return nil
}

func authenticateWorkspaceSubscriptionOperatorRequest(c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq) error {
	if err := authenticateRequest(c, req); err != nil {
		return fmt.Errorf("authenticate error : %v", err)
	}
	userUID, err := dao.DBClient.GetWorkspaceUserUid(req.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get user cr name: %v", err)
	}
	if req.UserUID != userUID {
		return fmt.Errorf("there is no permission to access this workspace")
	}
	return nil
}

type CustomResourceQuotaStatus struct {
	Hard map[v1.ResourceName]interface{} `json:"hard"` // 使用 interface{} 支持 Quantity 和 int64
	Used map[v1.ResourceName]interface{} `json:"used"`
}

// GetWorkspaceResourceQuota
// @Summary Get workspace resource quota
// @Description Get workspace resource quota
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceResourceQuotaReq true "WorkspaceResourceQuotaReq"
// @Success 200 {object} WorkspaceResourceQuotaResp
// @Router /workspace/v1alpha1/resource-quota [post]
func GetWorkspaceResourceQuota(c *gin.Context) {
	req, err := helper.ParseWorkspaceInfoReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateWorkspaceRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	var resQuota v1.ResourceQuota
	err = dao.K8sManager.GetClient().Get(context.Background(), client.ObjectKey{Name: "quota-" + req.Workspace, Namespace: req.Workspace}, &resQuota)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get resource quota: %v", err)})
		return
	}
	total, used, err := dao.DBClient.GetWorkspaceSubscriptionTraffic(req.Workspace, dao.DBClient.GetLocalRegion().Domain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription traffic: %v", err)})
		return
	}
	aiQuotaTotal, aiQuotaUsed, err := dao.DBClient.GetAIQuota(req.Workspace, dao.DBClient.GetLocalRegion().Domain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get AI quota: %v", err)})
		return
	}
	// 创建自定义配额状态
	customQuota := CustomResourceQuotaStatus{
		Hard: make(map[v1.ResourceName]interface{}),
		Used: make(map[v1.ResourceName]interface{}),
	}

	// 复制现有配额数据（除了 traffic）
	for key, value := range resQuota.Status.Hard {
		customQuota.Hard[key] = value
	}
	for key, value := range resQuota.Status.Used {
		customQuota.Used[key] = value
	}
	customQuota.Hard["traffic"] = total
	customQuota.Used["traffic"] = used
	customQuota.Hard["ai_quota"] = aiQuotaTotal
	customQuota.Used["ai_quota"] = aiQuotaUsed
	c.JSON(http.StatusOK, struct {
		Quota CustomResourceQuotaStatus `json:"quota"`
	}{
		Quota: customQuota,
	})
}
