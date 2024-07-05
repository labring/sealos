package notification

import (
	"context"
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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func GetPhoneNumberByNS(owner string) (string, error) {
	outh, err := dao.CK.GetUserOauthProvider(&pkgtypes.UserQueryOpts{
		Owner: owner,
	})
	if err != nil {
		return "", err
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
		return "", errors.New("user phone && email is not set, skip sms notification")
	}
	return phone, nil
}

func SendToSms(namespace, databaseName, clusterName, content string) error {
	smsClient, err := utils.CreateSMSClient(os.Getenv("SMSAccessKeyID"), os.Getenv("SMSAccessKeySecret"), os.Getenv("SMSEndpoint"))
	if err != nil {
		return err
	}
	name := strings.ReplaceAll(databaseName, "-", "/")
	owner, _ := GetNSOwner(namespace)
	phoneNumbers, err := GetPhoneNumberByNS(owner)
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
	fmt.Println(tea.String(phoneNumbers), name, api.ClusterRegionMap[clusterName], content)
	if err != nil {
		return err
	}
	return nil
}

func GetNSOwner(namespace string) (string, error) {
	// find owner debt
	ns, err := api.ClientSet.CoreV1().Namespaces().Get(context.Background(), namespace, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	return ns.Labels[api.OwnerLabel], nil
}
