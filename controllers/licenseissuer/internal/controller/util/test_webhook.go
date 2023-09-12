/*
Copyright 2023.

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

package util

import (
	"fmt"
	"time"
)

// this module is used to simulate a license webhook for testing

type LicenseWebhook struct {
}

func NewLicenseWebhook() *LicenseWebhook {
	return &LicenseWebhook{}
}

func (l *LicenseWebhook) Run() {
	for {
		cs := GetClusterStatus()
		fmt.Println("policy:", cs.BillingPolicy)
		fmt.Println("quota:", cs.CSBS.Quota)
		fmt.Println("used:", cs.CSBS.Used)
		validator := GetValidator()
		if validator.Validate() {
			fmt.Println("license is valid, no need to validate")
		} else {
			fmt.Println("license is invalid, please update license")
		}
		fmt.Println("=====================================")
		time.Sleep(time.Second * 15)
	}
}
