package notification

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/labring/sealos/controllers/account/controllers/utils"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/dao"
)

func GetPhoneNumberByNS(ns string) (string, error) {
	outh, err := dao.CK.GetUserOauthProvider(&pkgtypes.UserQueryOpts{
		Owner: ns,
	})
	if err != nil {
		return "", err
	}
	fmt.Println(111)
	phone, email := "", ""
	for i := range outh {
		if outh[i].ProviderType == pkgtypes.OauthProviderTypePhone {
			phone = outh[i].ProviderID
		} else if outh[i].ProviderType == pkgtypes.OauthProviderTypeEmail {
			email = outh[i].ProviderID
		}
	}
	fmt.Println(222)
	if phone == "" && email == "" {
		return "", errors.New("user phone && email is not set, skip sms notification")
	}
	fmt.Println(333)
	return phone, nil
}

func SendToSms(namespace, databaseName, clusterName, content string) error {
	fmt.Println(555)
	smsClient, err := utils.CreateSMSClient(os.Getenv("SMSAccessKeyID"), os.Getenv("SMSAccessKeySecret"), os.Getenv("SMSEndpoint"))
	if err != nil {
		fmt.Println(444)
		return err
	}
	name := strings.ReplaceAll(databaseName, "-", ".")
	phoneNumbers, err := GetPhoneNumberByNS(namespace)
	if err != nil {
		return err
	}
	fmt.Println(namespace, databaseName, clusterName, content, phoneNumbers)
	err = utils.SendSms(smsClient, &client.SendSmsRequest{
		PhoneNumbers: tea.String(phoneNumbers),
		SignName:     tea.String(os.Getenv("SMS_SIGN_NAME")),
		TemplateCode: tea.String(os.Getenv("SMS_CODE")),
		// user_id:, oweAmount
		TemplateParam: tea.String("{\"type\":\"" + "数据库" + "\",\"name\":\"" + name + "\",\"region\":\"" + api.ClusterRegionMap[clusterName] + "\",\"content\":\"" + content + "\"}"),
	})
	if err != nil {
		return err
	}
	return nil
}
