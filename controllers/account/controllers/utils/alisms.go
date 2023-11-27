package utils

import (
	"os"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi20170525 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	util "github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/labring/sealos/controllers/pkg/utils/env"
)

const (
	envAK = "ALI_SMS_AK"
	envSK = "ALI_SMS_SK"
	envEP = "ALI_SMS_ENDPOINT"
)

type AliSms struct{}

func CreateSMSClient() (*dysmsapi20170525.Client, error) {
	if err := env.CheckEnvSetting([]string{envAK, envSK, envEP}); err != nil {
		return nil, err
	}

	accessKeyId, accessKeySecret, endPoint := os.Getenv(envAK), os.Getenv(envSK), os.Getenv(envEP)
	config := &openapi.Config{
		AccessKeyId:     tea.String(accessKeyId),
		AccessKeySecret: tea.String(accessKeySecret),
		Endpoint:        tea.String(endPoint),
	}

	client, err := dysmsapi20170525.NewClient(config)
	return client, err
}

func SendSms(client *dysmsapi20170525.Client, req *dysmsapi20170525.SendSmsRequest) error {
	runtime := &util.RuntimeOptions{}
	_, err := client.SendSmsWithOptions(req, runtime)
	return err
}
