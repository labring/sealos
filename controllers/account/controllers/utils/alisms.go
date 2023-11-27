package utils

import (
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
func SendSms(client *dysmsapi20170525.Client, req *dysmsapi20170525.SendSmsRequest) error {
	runtime := &util.RuntimeOptions{}
	_, err := client.SendSmsWithOptions(req, runtime)
	return err
}
