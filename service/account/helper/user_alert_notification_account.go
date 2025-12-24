package helper

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

// UserAlertNotificationAccount request and response structures

// CreateUserAlertNotificationAccountReq represents the request to create a user alert notification account
type CreateUserAlertNotificationAccountReq struct {
	// @Summary User UUID
	// @Description User UUID
	// @JSONSchema required
	UserUID uuid.UUID `json:"userUid" bson:"userUid" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`

	// @Summary Provider type
	// @Description Provider type (Only EMAIL and PHONE are supported)
	// @JSONSchema required
	ProviderType types.OauthProviderType `json:"providerType" bson:"providerType" binding:"required" example:"EMAIL"`

	// @Summary Provider ID
	// @Description Provider ID (email address, phone number, etc.)
	// @JSONSchema required
	ProviderID string `json:"providerId" bson:"providerId" binding:"required" example:"user@example.com"`

	AuthBase `json:",inline" bson:",inline"`
}

func ParseCreateUserAlertNotificationAccountReq(
	c *gin.Context,
) (*CreateUserAlertNotificationAccountReq, error) {
	var req CreateUserAlertNotificationAccountReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, fmt.Errorf("failed to bind request: %w", err)
	}
	return &req, nil
}

// CreateUserAlertNotificationAccountResp represents the response for creating a user alert notification account
type CreateUserAlertNotificationAccountResp struct {
	Data    CreateUserAlertNotificationAccountRespData `json:"data"`
	Message string                                     `json:"message"`
}

type CreateUserAlertNotificationAccountRespData struct {
	ID           uuid.UUID               `json:"id"`
	UserUID      uuid.UUID               `json:"userUid"`
	ProviderType types.OauthProviderType `json:"providerType"`
	ProviderID   string                  `json:"providerId"`
}

// ListUserAlertNotificationAccountsReq represents the request to list user alert notification accounts
type ListUserAlertNotificationAccountsReq struct {
	AuthBase `json:",inline" bson:",inline"`
}

func ParseListUserAlertNotificationAccountsReq(
	c *gin.Context,
) (*ListUserAlertNotificationAccountsReq, error) {
	var req ListUserAlertNotificationAccountsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, fmt.Errorf("failed to bind request: %w", err)
	}
	return &req, nil
}

// ListUserAlertNotificationAccountsResp represents the response for listing user alert notification accounts
type ListUserAlertNotificationAccountsResp struct {
	Data    []UserAlertNotificationAccountData `json:"data"`
	Message string                             `json:"message"`
}

type UserAlertNotificationAccountData struct {
	ID           uuid.UUID               `json:"id"`
	UserUID      uuid.UUID               `json:"userUid"`
	ProviderType types.OauthProviderType `json:"providerType"`
	ProviderID   string                  `json:"providerId"`
	IsEnabled    bool                    `json:"isEnabled"`
	CreatedAt    time.Time               `json:"createdAt"`
	UpdatedAt    time.Time               `json:"updatedAt"`
}

// DeleteUserAlertNotificationAccountReq represents the request to delete user alert notification accounts
type DeleteUserAlertNotificationAccountReq struct {
	// @Summary Account IDs
	// @Description List of account IDs to delete
	// @JSONSchema required
	IDs []uuid.UUID `json:"ids" bson:"ids" binding:"required" example:"["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]"`

	// @Summary User UUID
	// @Description User UUID
	// @JSONSchema required
	UserUID uuid.UUID `json:"userUid" bson:"userUid" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`

	AuthBase `json:",inline" bson:",inline"`
}

func ParseDeleteUserAlertNotificationAccountReq(
	c *gin.Context,
) (*DeleteUserAlertNotificationAccountReq, error) {
	var req DeleteUserAlertNotificationAccountReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, fmt.Errorf("failed to bind request: %w", err)
	}
	return &req, nil
}

// DeleteUserAlertNotificationAccountResp represents the response for deleting user alert notification accounts
type DeleteUserAlertNotificationAccountResp struct {
	Data    DeleteUserAlertNotificationAccountRespData `json:"data"`
	Message string                                     `json:"message"`
}

type DeleteUserAlertNotificationAccountRespData struct {
	DeletedCount int      `json:"deletedCount"`
	DeletedIDs   []string `json:"deletedIds"`
}

// ToggleUserAlertNotificationAccountsReq represents the request to toggle multiple user alert notification accounts
type ToggleUserAlertNotificationAccountsReq struct {
	// @Summary Account IDs
	// @Description List of account IDs to toggle
	// @JSONSchema required
	IDs []uuid.UUID `json:"ids" bson:"ids" binding:"required" example:"["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]"`

	// @Summary Enable flag
	// @Description Set to true to enable, false to disable
	// @JSONSchema required
	IsEnabled *bool `json:"isEnabled" bson:"isEnabled" binding:"required" example:"true"`

	AuthBase `json:",inline" bson:",inline"`
}

func ParseToggleUserAlertNotificationAccountsReq(
	c *gin.Context,
) (*ToggleUserAlertNotificationAccountsReq, error) {
	var req ToggleUserAlertNotificationAccountsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, fmt.Errorf("failed to bind request: %w", err)
	}
	return &req, nil
}

// ToggleUserAlertNotificationAccountsResp represents the response for toggling user alert notification accounts
type ToggleUserAlertNotificationAccountsResp struct {
	Data    ToggleUserAlertNotificationAccountsRespData `json:"data"`
	Message string                                      `json:"message"`
}

type ToggleUserAlertNotificationAccountsRespData struct {
	UpdatedCount int      `json:"updatedCount"`
	UpdatedIDs   []string `json:"updatedIds"`
}
