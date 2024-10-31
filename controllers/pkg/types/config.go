/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package types

type Configs struct {
	Type ConfigType `json:"type" gorm:"type:varchar(255);not null,primaryKey"`
	Data string     `json:"data" gorm:"type:jsonb"`
}

type ConfigType string

const AccountConfigType ConfigType = "account"

type AccountConfig struct {
	TaskProcessRegion          string            `json:"taskProcessRegion"`
	FirstRechargeDiscountSteps map[int64]float64 `json:"firstRechargeDiscountSteps"`
	DefaultDiscountSteps       map[int64]float64 `json:"defaultDiscountSteps"`
}

func (c Configs) TableName() string {
	return "Configs"
}
