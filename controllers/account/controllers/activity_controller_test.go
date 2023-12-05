// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"
)

func Test_parseUserActivitiesAnnotation(t *testing.T) {
	annotations := map[string]string{
		"activity/beginner-guide/launchpad/startTime":    "2016-03-04T15:04:05Z",
		"activity/beginner-guide/launchpad/rechargeNums": "1",
		"activity/beginner-guide/launchpad/giveAmount":   "10000",
		"activity/beginner-guide/current-phase":          "launchpad",
	}

	userActivities, err := types.ParseUserActivities(annotations)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	if len(userActivities) != 1 {
		t.Errorf("Expected 1 activity type, got %d", len(userActivities))
	}

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
	tmpTime, _ := time.Parse(time.RFC3339, "2006-01-02T15:04:05Z")
	if phase.StartTime.Equal(tmpTime) {
		t.Errorf("Expected phase start time '$time', got %s", phase.StartTime)
	}

	if phase.RechargeNums != 1 {
		t.Errorf("Expected recharge nums 1, got %d", phase.RechargeNums)
	}

	if phase.GiveAmount != 10000 {
		t.Errorf("Expected give amount 10000, got %d", phase.GiveAmount)
	}
}
