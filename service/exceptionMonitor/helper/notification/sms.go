package notification

import (
	"errors"
	"os"
	"strings"

	"github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/labring/sealos/controllers/pkg/types"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/notifier"
	"github.com/labring/sealos/service/exceptionMonitor/api"
	"github.com/labring/sealos/service/exceptionMonitor/dao"
)

func GetPhoneNumberByNS(ns string) (error, string) {
	outh, err := dao.CK.GetUserOauthProvider(&types.UserQueryOpts{
		Owner: ns,
	})
	if err != nil {
		return err, ""
	}
	phone, email := "", ""
	for i := range outh {
		if outh[i].ProviderType == pkgtypes.OauthProviderTypePhone {
			phone = outh[i].ProviderID
		} else if outh[i].ProviderType == pkgtypes.OauthProviderTypeEmail {
			email = outh[i].ProviderID
		}
	}
	if phone == "" && email == "" {
		return errors.New("user phone && email is not set, skip sms notification"), ""
	}
	return nil, phone
}

func SendToSms(namespace, databaseName, clusterName, content string) error {
	smsClient, err := notifier.CreateSMSClient(os.Getenv("SMSAccessKeyID"), os.Getenv("SMSAccessKeySecret"), os.Getenv("SMSEndpoint"))
	if err != nil {
		return err
	}
	name := strings.ReplaceAll(databaseName, "-", ".")
	err, phoneNumbers := GetPhoneNumberByNS(namespace)
	if err != nil {
		return err
	}
	err = notifier.SendSms(smsClient, &client.SendSmsRequest{
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
