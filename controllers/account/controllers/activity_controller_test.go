package controllers

import (
	"testing"

	"github.com/labring/sealos/controllers/pkg/types"
)

func Test_parseUserActivitiesAnnotation(t *testing.T) {
	annotations := map[string]string{
		"activity/beginner-guide/launchpad/startTime":    "$time",
		"activity/beginner-guide/launchpad/rechargeNums": "1",
		"activity/beginner-guide/launchpad/giveAmount":   "10000",
		"activity/beginner-guide/current-phase":          "launchpad",
	}

	userActivities, err := types.ParseUserActivities(annotations)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	// 验证是否正确解析
	if len(userActivities) != 1 {
		t.Errorf("Expected 1 activity type, got %d", len(userActivities))
	}

	// 验证 userActivities 中的数据是否正确
	activity, exists := userActivities["beginner-guide"]
	if !exists {
		t.Errorf("Expected activity type 'beginner-guide' not found")
	}

	if activity.CurrentPhase != "launchpad" {
		t.Errorf("Expected current phase 'launchpad', got %s", activity.CurrentPhase)
	}

	if len(activity.Phases) != 1 {
		t.Errorf("Expected 1 phase, got %d", len(activity.Phases))
	}

	phase, exists := activity.Phases["launchpad"]
	if !exists {
		t.Errorf("Expected phase 'launchpad' not found")
	}

	if phase.Name != "launchpad" {
		t.Errorf("Expected phase name 'launchpad', got %s", phase.Name)
	}

	if phase.StartTime != "$time" {
		t.Errorf("Expected phase start time '$time', got %s", phase.StartTime)
	}

	if phase.RechargeNums != 1 {
		t.Errorf("Expected recharge nums 1, got %d", phase.RechargeNums)
	}

	if phase.GiveAmount != 10000 {
		t.Errorf("Expected give amount 10000, got %d", phase.GiveAmount)
	}
}
