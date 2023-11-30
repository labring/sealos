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

package utils

import (
	"fmt"
	"os"
	"testing"

	"github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
)

func TestSendSms(t *testing.T) {
	clt, err := CreateSMSClient(os.Getenv("ak"), os.Getenv("sk"), "dysmsapi.aliyuncs.com")
	if err != nil {
		t.Fatal(err)
	}
	userID, oweAmount := "uid", "1234"
	err = SendSms(clt, &client.SendSmsRequest{
		PhoneNumbers: tea.String(os.Getenv("phone")),
		SignName:     tea.String(os.Getenv("sign_name")),
		TemplateCode: tea.String(os.Getenv("template_code")),
		// user_id:, oweAmount
		TemplateParam: tea.String("{\"user_id\":\"" + userID + "\",\"oweamount\":\"" + oweAmount + "\"}"),
	})
	if err != nil {
		t.Fatal(fmt.Errorf("send sms failed: %w", err))
	}
}
