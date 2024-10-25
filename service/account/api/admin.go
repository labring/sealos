package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// GetAccount
// @Summary Get user account
// @Description Get user account
// @Tags Account
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully retrieved user account"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user account"
// @Router /account/v1alpha1/account [post]
func AdminGetAccountWithWorkspaceID(c *gin.Context) {
	user, err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	account, err := dao.DBClient.GetAccountWithWorkspace(user.WorkspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get account : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"account": account,
	})
}

const AdminUserName = "sealos-admin"

func authenticateAdminRequest(c *gin.Context) (*helper.JwtUser, error) {
	user, err := dao.JwtMgr.ParseUser(c)
	if err != nil {
		return user, fmt.Errorf("failed to parse user: %v", err)
	}
	if user == nil {
		return user, fmt.Errorf("user not found")
	}
	if user.Requester != AdminUserName {
		return user, fmt.Errorf("user is not admin")
	}
	return user, nil
}
