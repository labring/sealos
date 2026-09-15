package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// AdminListNotificationRecipients returns notify-compatible notification recipients for workspace owners.
// It includes OAuth contacts and enabled user-configured notification contacts, without active-user filtering.
// @Summary List notification recipients for admin
// @Description Resolve workspace namespaces to notify-compatible email or phone recipients. Notification methods default to email.
// @Tags AdminRead
// @Accept json
// @Produce json
// @Param request body helper.AdminNotificationRecipientsReq true "Notification recipient request"
// @Success 200 {object} helper.AdminNotificationRecipientsResp
// @Failure 400 {object} helper.ErrorMessage
// @Failure 401 {object} helper.ErrorMessage
// @Failure 500 {object} helper.ErrorMessage
// @Router /admin/v1alpha1/notification-recipients [post]
func AdminListNotificationRecipients(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	req, err := helper.ParseAdminNotificationRecipientsReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminNotificationRecipients(*req)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
