package notification

import (
	"github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/labring/sealos/controllers/account/controllers/utils"
	"github.com/labring/sealos/controllers/pkg/types"
	_ "github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/exceptionMonitor/api"
	"github.com/labring/sealos/service/exceptionMonitor/dao"
	"os"
	"strings"
)

func GetPhoneNumberByNS(ns string) (error, string) {
	provider, err := dao.CK.GetUserOauthProvider(&types.UserQueryOpts{
		Owner: ns,
	})
	if err != nil {
		return err, ""
	}
	return nil, provider.ProviderID
}

func SendToSms(namespace, databaseName, clusterName, content string) error {
	smsClient, err := utils.CreateSMSClient(os.Getenv("SMSAccessKeyID"), os.Getenv("SMSAccessKeySecret"), os.Getenv("SMSEndpoint"))
	if err != nil {
		return err
	}
	name := strings.ReplaceAll(databaseName, "-", ".")
	err, phoneNumbers := GetPhoneNumberByNS(namespace)
	if err != nil {
		return err
	}
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
