package types

import (
	"fmt"
	"strings"
)

type RechargeDiscount struct {
	LimitTimes    int       `json:"limitTimes"`
	LimitDuration string    `json:"limitDuration"`
	DiscountRates []float64 `json:"discountRates"`
	DiscountSteps []int     `json:"discountSteps"`
}

type Phase struct {
	Name             string           `json:"name"`
	GiveAmount       int              `json:"giveAmount"`
	RechargeDiscount RechargeDiscount `json:"rechargeDiscount"`
}

type Activity struct {
	ActivityType string           `json:"activityType"`
	Phases       map[string]Phase `json:"phases"`
	PhaseOrder   string           `json:"phaseOrder"`
}

type UserActivities map[string]*UserActivity

type UserPhase struct {
	Name         string `json:"name"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
	RechargeNums int64  `json:"rechargeNums"`
	GiveAmount   int64  `json:"giveAmount"`
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

			switch parts[3] {
			case "startTime":
				userActivities[activityType].Phases[phase].StartTime = value
			case "endTime":
				userActivities[activityType].Phases[phase].EndTime = value
			case "rechargeNums":
				fmt.Sscanf(value, "%d", &userActivities[activityType].Phases[phase].RechargeNums)
			case "giveAmount":
				fmt.Sscanf(value, "%d", &userActivities[activityType].Phases[phase].GiveAmount)
			}
		}
	}
	return userActivities, nil
}
