package api

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"k8s.io/apimachinery/pkg/api/resource"

	v1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/labring/sealos/service/account/dao"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/helper"
)

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
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	userUID, err := dao.DBClient.GetWorkspaceUserUid(req.Workspace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user cr name: %v", err)})
		return
	}
	if req.UserUID != userUID {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("there is no permission to access this workspace")})
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

	totalQ, err := resource.ParseQuantity(strconv.FormatInt(total, 10))
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse total traffic quantity: %v", err)})
		return
	}
	usedQ, err := resource.ParseQuantity(strconv.FormatInt(used, 10))
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse used traffic quantity: %v", err)})
		return
	}

	resQuota.Status.Hard["traffic"] = totalQ
	resQuota.Status.Used["traffic"] = usedQ
	c.JSON(http.StatusOK, struct {
		Quota v1.ResourceQuotaStatus `json:"quota"`
	}{
		Quota: resQuota.Status,
	})
}
