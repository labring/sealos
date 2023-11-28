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
