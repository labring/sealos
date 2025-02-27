// Copyright © 2021 sealos.
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

package settings

import (
	"time"
)

type Config struct {
	WaitTime      time.Duration
	MaxWaiteTime  time.Duration
	SealosBinPath string
}

var E2EConfig *Config

// init test params and settings
func init() {
	E2EConfig = &Config{}
	defaultWaiteTime := GetEnvWithDefault(DefaultWaiteTime, "300s")
	E2EConfig.WaitTime, _ = time.ParseDuration(defaultWaiteTime)
	maxWaiteTime := GetEnvWithDefault(MaxWaiteTime, "2400s")
	E2EConfig.MaxWaiteTime, _ = time.ParseDuration(maxWaiteTime)
	E2EConfig.SealosBinPath = GetEnvWithDefault(TestSealosBinPath, DefaultSealosBinPath)
}
