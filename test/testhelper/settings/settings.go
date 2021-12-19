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
	"os"
	"time"
)

// init test params and settings
func init() {
	defaultWaiteTime := os.Getenv("DEFAULT_WAITE_TIME")
	if defaultWaiteTime == "" {
		DefaultWaiteTime = 300 * time.Second
	} else {
		DefaultWaiteTime, _ = time.ParseDuration(defaultWaiteTime)
	}

	maxWaiteTime := os.Getenv("MAX_WAITE_TIME")
	if maxWaiteTime == "" {
		MaxWaiteTime = 2400 * time.Second
	} else {
		MaxWaiteTime, _ = time.ParseDuration(maxWaiteTime)
	}

	pollingInterval := os.Getenv("DEFAULT_POLLING_INTERVAL")
	if pollingInterval == "" {
		DefaultPollingInterval = 10
	}
}
