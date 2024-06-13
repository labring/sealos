package notifier

import (
	"fmt"

	client2 "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	"github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
)

func CreateSMSClient(ak, sk, endpoint string) (*client.Client, error) {
	config := &client2.Config{
		AccessKeyId:     tea.String(ak),
		AccessKeySecret: tea.String(sk),
		Endpoint:        tea.String(endpoint),
	}
	client, err := client.NewClient(config)
	return client, err
}

//	SendSms   sendSmsRequest := &dysmsapi20170525.SendSmsRequest{
//	   PhoneNumbers: tea.String("18888888888"),
//	   SignName: tea.String("环界云"),
//	   TemplateCode: tea.String("SMS_xxx"),
//	   TemplateParam: tea.String("{\"code\":\"1234\"}"),
//	 }/*
func SendSms(client *client.Client, req *client.SendSmsRequest) (err error) {
	runtime := &service.RuntimeOptions{}
	resp, err := client.SendSmsWithOptions(req, runtime)
	if err != nil {
		return err
	}
	if *resp.Body.Code != "OK" {
		return fmt.Errorf("send sms err code %s: %s", *resp.Body.Code, *resp.Body.Message)
	}
	return err
}
