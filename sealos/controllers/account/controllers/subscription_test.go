package controllers

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/utils"
)

func Test_sendFlushQuotaRequest(t *testing.T) {
	regions := []string{""}
	jwtManager := utils.NewJWTManager("", time.Hour)
	os.Setenv("LOCAL_REGION", "")
	account, err := database.NewAccountV2("", "")
	if err != nil {
		t.Fatalf("failed to new account: %v", err)
	}
	defer func() {
		if err := account.Close(); err != nil {
			t.Errorf("failed close connection: %v", err)
		}
	}()
	err = FetchAndFlushSubscriptions(account.GetGlobalDB(), regions, jwtManager)
	if err != nil {
		t.Fatalf("failed to fetch and flush subscriptions: %v", err)
	}
	t.Logf("successfully fetch and flush subscriptions")
}

func FetchAndFlushSubscriptions(db *gorm.DB, allRegion []string, jwtManager *utils.JWTManager) error {
	var subscriptions []types.Subscription

	// Query subscriptions where PlanName is not "Free"
	result := db.Where("plan_name != ? AND status != ?", "Free", "DEBT").Find(&subscriptions)
	if result.Error != nil {
		return fmt.Errorf("failed to fetch subscriptions: %w", result.Error)
	}

	fmt.Printf("fetched %d subscriptions\n", len(subscriptions))

	// Iterate through each subscription and call sendFlushQuotaRequest
	for _, sub := range subscriptions {
		if sub.PlanName == "Free" || sub.Status == "DEBT" {
			// Skip subscriptions with PlanName "Free" or status "DEBT"
			fmt.Printf("Skipping subscription for user %s with plan %s and status %s\n", sub.UserUID, sub.PlanName, sub.Status)
			continue
		}
		err := sendFlushQuotaRequest(allRegion, jwtManager, sub.UserUID, sub.PlanID, sub.PlanName)
		if err != nil {
			// Log the error but continue processing other subscriptions
			fmt.Printf("Failed to flush quota %s for user %s: %v\n", sub.PlanName, sub.UserUID, err)
			continue
		}
		fmt.Printf("Successfully flushed quota %s for user %s\n", sub.PlanName, sub.UserUID)
	}
	return nil
}
