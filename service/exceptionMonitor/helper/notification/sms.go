package notification

import (
	"exceptionMonitor/dao"
	"fmt"
	"github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/labring/sealos/controllers/account/controllers/utils"
	"github.com/labring/sealos/controllers/pkg/types"
	_ "github.com/labring/sealos/service/account/dao"
	"os"
	"strings"
)

var (
	clusterRegionMap = map[string]string{
		"io":  "新加坡集群",
		"bja": "北京集群",
		"hzh": "杭州集群",
		"gzg": "广州集群",
		"top": "国内集群",
	}
)

func GetPhoneNumberByNS(ns string) string {
	provider, err := dao.CK.GetUserOauthProvider(&types.UserQueryOpts{
		Owner: ns,
	})
	if err != nil {
		fmt.Println("GetUserOauthProvider():", err)
		return ""
	}
	return provider.ProviderID
}

func SendToSms(namespace, databaseName, clusterName, content string) {
	smsClient, err := utils.CreateSMSClient(os.Getenv("SMSAccessKeyID"), os.Getenv("SMSAccessKeySecret"), os.Getenv("SMSEndpoint"))
	if err != nil {
		fmt.Println(err)
	}
	name := strings.ReplaceAll(databaseName, "-", ".")

	err = utils.SendSms(smsClient, &client.SendSmsRequest{
		PhoneNumbers: tea.String(GetPhoneNumberByNS(namespace)),
		SignName:     tea.String(os.Getenv("SMS_SIGN_NAME")),
		TemplateCode: tea.String(os.Getenv("SMS_CODE")),
		// user_id:, oweAmount
		TemplateParam: tea.String("{\"type\":\"" + "数据库" + "\",\"name\":\"" + name + "\",\"region\":\"" + clusterRegionMap[clusterName] + "\",\"content\":\"" + content + "\"}"),
	})
	if err != nil {
		fmt.Println(err)
	}
}
