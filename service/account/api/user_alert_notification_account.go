package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"gorm.io/gorm"
)

// CreateUserAlertNotificationAccount
// @Summary Create user alert notification account
// @Description Create a new user alert notification account. Only EMAIL and PHONE provider types are supported.
// @Tags UserAlertNotificationAccount
// @Accept json
// @Produce json
// @Param request body helper.CreateUserAlertNotificationAccountReq true "Create user alert notification account request"
// @Success 200 {object} helper.CreateUserAlertNotificationAccountResp "Successfully created user alert notification account"
// @Failure 400 {object} helper.ErrorMessage "Failed to parse create user alert notification account request or unsupported provider type"
// @Failure 401 {object} helper.ErrorMessage "Authentication error"
// @Failure 500 {object} helper.ErrorMessage "Failed to create user alert notification account"
// @Router /account/v1alpha1/user-alert-notification-account [post]
func CreateUserAlertNotificationAccount(c *gin.Context) {
	req, err := helper.ParseCreateUserAlertNotificationAccountReq(c)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to parse create user alert notification account request: %v", err),
			},
		)
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}

	// Validate provider type - only EMAIL and PHONE are supported
	if req.ProviderType != types.OauthProviderTypeEmail && req.ProviderType != types.OauthProviderTypePhone {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{
				Error: fmt.Sprintf("unsupported provider type: %s. Only EMAIL and PHONE are supported", req.ProviderType),
			},
		)
		return
	}

	// Create the user alert notification account
	account := &types.UserAlertNotificationAccount{
		ID:           uuid.New(),
		UserUID:      req.UserUID,
		ProviderType: req.ProviderType,
		ProviderID:   req.ProviderID,
		IsEnabled:    true, // Default to enabled
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := dao.DBClient.CreateUserAlertNotificationAccount(account); err != nil {
		// Check for duplicate key error
		if errors.Is(err, gorm.ErrDuplicatedKey) || isDuplicatedKeyError(err) {
			c.JSON(
				http.StatusConflict,
				helper.ErrorMessage{
					Error: fmt.Sprintf("user alert notification account already exists: %v", err),
				},
			)
			return
		}
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to create user alert notification account: %v", err),
			},
		)
		return
	}

	c.JSON(http.StatusOK, helper.CreateUserAlertNotificationAccountResp{
		Data: helper.CreateUserAlertNotificationAccountRespData{
			ID:           account.ID,
			UserUID:      account.UserUID,
			ProviderType: account.ProviderType,
			ProviderID:   account.ProviderID,
		},
		Message: "Successfully created user alert notification account",
	})
}

// ListUserAlertNotificationAccounts
// @Summary List user alert notification accounts
// @Description List all user alert notification accounts for a user
// @Tags UserAlertNotificationAccount
// @Accept json
// @Produce json
// @Param request body helper.ListUserAlertNotificationAccountsReq true "List user alert notification accounts request"
// @Success 200 {object} helper.ListUserAlertNotificationAccountsResp "Successfully listed user alert notification accounts"
// @Failure 400 {object} helper.ErrorMessage "Failed to parse list user alert notification accounts request"
// @Failure 401 {object} helper.ErrorMessage "Authentication error"
// @Failure 500 {object} helper.ErrorMessage "Failed to list user alert notification accounts"
// @Router /account/v1alpha1/user-alert-notification-account/list [post]
func ListUserAlertNotificationAccounts(c *gin.Context) {
	req, err := helper.ParseListUserAlertNotificationAccountsReq(c)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to parse list user alert notification accounts request: %v", err),
			},
		)
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}

	accounts, err := dao.DBClient.ListUserAlertNotificationAccounts(req.UserUID)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to list user alert notification accounts: %v", err),
			},
		)
		return
	}

	accountList := make([]helper.UserAlertNotificationAccountData, len(accounts))
	for i, account := range accounts {
		accountList[i] = helper.UserAlertNotificationAccountData{
			ID:           account.ID,
			UserUID:      account.UserUID,
			ProviderType: account.ProviderType,
			ProviderID:   account.ProviderID,
			IsEnabled:    account.IsEnabled,
			CreatedAt:    account.CreatedAt,
			UpdatedAt:    account.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, helper.ListUserAlertNotificationAccountsResp{
		Data:    accountList,
		Message: "Successfully listed user alert notification accounts",
	})
}

// DeleteUserAlertNotificationAccount
// @Summary Delete user alert notification accounts
// @Description Delete multiple user alert notification accounts
// @Tags UserAlertNotificationAccount
// @Accept json
// @Produce json
// @Param request body helper.DeleteUserAlertNotificationAccountReq true "Delete user alert notification accounts request"
// @Success 200 {object} helper.DeleteUserAlertNotificationAccountResp "Successfully deleted user alert notification accounts"
// @Failure 400 {object} helper.ErrorMessage "Failed to parse delete user alert notification accounts request"
// @Failure 401 {object} helper.ErrorMessage "Authentication error"
// @Failure 500 {object} helper.ErrorMessage "Failed to delete user alert notification accounts"
// @Router /account/v1alpha1/user-alert-notification-account/delete [post]
func DeleteUserAlertNotificationAccount(c *gin.Context) {
	req, err := helper.ParseDeleteUserAlertNotificationAccountReq(c)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to parse delete user alert notification accounts request: %v", err),
			},
		)
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}

	deletedCount, deletedIDs, err := dao.DBClient.DeleteUserAlertNotificationAccounts(req.IDs, req.UserUID)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to delete user alert notification accounts: %v", err),
			},
		)
		return
	}

	c.JSON(http.StatusOK, helper.DeleteUserAlertNotificationAccountResp{
		Data: helper.DeleteUserAlertNotificationAccountRespData{
			DeletedCount: deletedCount,
			DeletedIDs:   deletedIDs,
		},
		Message: fmt.Sprintf("Successfully deleted %d user alert notification accounts", deletedCount),
	})
}

// ToggleUserAlertNotificationAccounts
// @Summary Toggle user alert notification accounts
// @Description Enable or disable multiple user alert notification accounts
// @Tags UserAlertNotificationAccount
// @Accept json
// @Produce json
// @Param request body helper.ToggleUserAlertNotificationAccountsReq true "Toggle user alert notification accounts request"
// @Success 200 {object} helper.ToggleUserAlertNotificationAccountsResp "Successfully toggled user alert notification accounts"
// @Failure 400 {object} helper.ErrorMessage "Failed to parse toggle user alert notification accounts request"
// @Failure 401 {object} helper.ErrorMessage "Authentication error"
// @Failure 500 {object} helper.ErrorMessage "Failed to toggle user alert notification accounts"
// @Router /account/v1alpha1/user-alert-notification-account/toggle [post]
func ToggleUserAlertNotificationAccounts(c *gin.Context) {
	req, err := helper.ParseToggleUserAlertNotificationAccountsReq(c)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to parse toggle user alert notification accounts request: %v", err),
			},
		)
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}

	updatedCount, updatedIDs, err := dao.DBClient.ToggleUserAlertNotificationAccounts(req.IDs, *req.IsEnabled)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to toggle user alert notification accounts: %v", err),
			},
		)
		return
	}

	c.JSON(http.StatusOK, helper.ToggleUserAlertNotificationAccountsResp{
		Data: helper.ToggleUserAlertNotificationAccountsRespData{
			UpdatedCount: updatedCount,
			UpdatedIDs:   updatedIDs,
		},
		Message: fmt.Sprintf("Successfully toggled %d user alert notification accounts", updatedCount),
	})
}

// isDuplicatedKeyError checks if the error indicates a duplicate key violation
func isDuplicatedKeyError(err error) bool {
	errStr := strings.ToLower(err.Error())
	return strings.Contains(errStr, "duplicate") ||
		   strings.Contains(errStr, "duplicated") ||
		   strings.Contains(errStr, "unique constraint") ||
		   strings.Contains(errStr, "violates unique constraint") ||
		   strings.Contains(errStr, "primary key violation")
}
