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

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi20170525 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	util "github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
)

func CreateSMSClient(ak, sk, endpoint string) (*dysmsapi20170525.Client, error) {
	config := &openapi.Config{
		AccessKeyId:     tea.String(ak),
		AccessKeySecret: tea.String(sk),
		Endpoint:        tea.String(endpoint),
	}
	client, err := dysmsapi20170525.NewClient(config)
	return client, err
}

//	SendSms   sendSmsRequest := &dysmsapi20170525.SendSmsRequest{
//	   PhoneNumbers: tea.String("18888888888"),
//	   SignName: tea.String("环界云"),
//	   TemplateCode: tea.String("SMS_xxx"),
//	   TemplateParam: tea.String("{\"code\":\"1234\"}"),
//	 }/*
func SendSms(client *dysmsapi20170525.Client, req *dysmsapi20170525.SendSmsRequest) (err error) {
	runtime := &util.RuntimeOptions{}
	resp, err := client.SendSmsWithOptions(req, runtime)
	if err != nil {
		return err
	}
	if *resp.Body.Code != "OK" {
		return fmt.Errorf("send sms err code %s: %s", *resp.Body.Code, *resp.Body.Message)
	}
	return err
}
