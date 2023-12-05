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

package types

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type RechargeDiscount struct {
	LimitTimes      int64           `json:"limitTimes,omitempty"`
	LimitDuration   string          `json:"limitDuration,omitempty"`
	DiscountRates   []float64       `json:"discountRates,omitempty"`
	DiscountSteps   []int64         `json:"discountSteps,omitempty"`
	SpecialDiscount map[int64]int64 `json:"specialDiscount,omitempty"`
}

type Phase struct {
	Name             string           `json:"name"`
	GiveAmount       int              `json:"giveAmount"`
	RechargeDiscount RechargeDiscount `json:",inline"`
}

type Activity struct {
	ActivityType string           `json:"activityType"`
	Phases       map[string]Phase `json:"phases"`
	PhaseOrder   string           `json:"phaseOrder"`
}

type Activities map[string]*Activity

type UserActivities map[string]*UserActivity

type UserPhase struct {
	Name string `json:"name"`
	//RFC339 time format
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	RechargeNums int64     `json:"rechargeNums"`
	GiveAmount   int64     `json:"giveAmount"`
}

type UserActivity struct {
	CurrentPhase string `json:"currentPhase"`
	Phases       map[string]*UserPhase
}

func ParseUserActivities(annotations map[string]string) (UserActivities, error) {
	userActivities := make(map[string]*UserActivity)

	for key, value := range annotations {
		parts := strings.Split(key, "/")

		if len(parts) == 3 && parts[0] == "activity" && parts[2] == "current-phase" {
			if _, exists := userActivities[parts[1]]; !exists {
				userActivities[parts[1]] = &UserActivity{
					Phases: make(map[string]*UserPhase),
				}
			}
			userActivities[parts[1]].CurrentPhase = value
		}

		if len(parts) == 4 && parts[0] == "activity" {
			activityType := parts[1]
			phase := parts[2]

			if _, exists := userActivities[activityType]; !exists {
				userActivities[activityType] = &UserActivity{
					Phases: make(map[string]*UserPhase),
				}
			}

			if _, exists := userActivities[activityType].Phases[phase]; !exists {
				userActivities[activityType].Phases[phase] = &UserPhase{Name: phase}
			}
			var err error
			switch parts[3] {
			case "startTime":
				fmt.Println(value)
				userActivities[activityType].Phases[phase].StartTime, err = time.Parse(time.RFC3339, value)
				if err != nil {
					return nil, fmt.Errorf("parse start time failed: %w", err)
				}
			case "endTime":
				userActivities[activityType].Phases[phase].EndTime, err = time.Parse(time.RFC3339, value)
				if err != nil {
					return nil, fmt.Errorf("parse end time failed: %w", err)
				}
			case "rechargeNums":
				userActivities[activityType].Phases[phase].RechargeNums, err = strconv.ParseInt(value, 10, 64)
				if err != nil {
					return nil, fmt.Errorf("parse %s to recharge nums failed: %w", value, err)
				}
			case "giveAmount":
				userActivities[activityType].Phases[phase].GiveAmount, err = strconv.ParseInt(value, 10, 64)
				if err != nil {
					return nil, fmt.Errorf("parse %s to give amount failed: %w", value, err)
				}
			}
		}
	}
	return userActivities, nil
}

func GetUserActivityDiscount(activities Activities, userActivities *UserActivities) (*RechargeDiscount, error) {
	if activities == nil || userActivities == nil {
		return nil, fmt.Errorf("activities is nil")
	}
	for activityType, userActivity := range *userActivities {
		activity := activities[activityType]
		phase, exists := activity.Phases[userActivity.CurrentPhase]
		if !exists {
			return nil, fmt.Errorf("phase %s not exist", userActivity.CurrentPhase)
		}

		if phase.RechargeDiscount.LimitTimes > 0 && userActivity.Phases[userActivity.CurrentPhase].RechargeNums >= phase.RechargeDiscount.LimitTimes {
			return nil, nil
		}
		if phase.RechargeDiscount.LimitDuration != "" {
			duration, err := time.ParseDuration(phase.RechargeDiscount.LimitDuration)
			if err != nil {
				return nil, fmt.Errorf("parse duration failed: %w", err)
			}
			if time.Now().After(userActivity.Phases[userActivity.CurrentPhase].StartTime.Add(duration)) {
				return nil, nil
			}
		}
		return &phase.RechargeDiscount, nil
	}
	return nil, fmt.Errorf("user activity not exist")
}
