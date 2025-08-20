// Copyright © 2024 sealos.
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

package utils_test

import (
	"os"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/account/controllers/utils"
	"github.com/volcengine/volc-sdk-golang/service/vms"
)

func TestSendVms(t *testing.T) {
	vms.DefaultInstance.SetAccessKey(os.Getenv("VMS_AK"))
	vms.DefaultInstance.SetSecretKey(os.Getenv("VMS_SK"))
	testData := struct {
		phone        string
		template     string
		numberPollNo string
		sendTime     time.Time
	}{
		phone:        "",
		template:     "",
		numberPollNo: "",
		sendTime:     time.Now(),
	}
	err := utils.SendVms(
		testData.phone,
		testData.template,
		testData.numberPollNo,
		testData.sendTime,
		[]string{"10:00-20:00"},
	)
	if err != nil {
		t.Fatal(err)
	}
	t.Log("SendVms success")
}
