package cockroach

import (
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

func (c *Cockroach) GetNotificationRecipient(
	userUID uuid.UUID,
) (*types.NotificationRecipient, error) {
	var result types.NotificationRecipient
	err := c.DB.Model(&types.User{}).
		Select(`
        "User".nickname AS user_name,
        COALESCE((SELECT op."providerId" FROM "OauthProvider" op WHERE op."userUid" = "User".uid AND op."providerType" = 'EMAIL' LIMIT 1), '') AS email,
        COALESCE((SELECT op."providerId" FROM "OauthProvider" op WHERE op."userUid" = "User".uid AND op."providerType" = 'PHONE' LIMIT 1), '') AS phone_number,
        "User".id AS user_id,
        "User".uid AS user_uid
    `).
		Where("uid = ?", userUID).
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}
