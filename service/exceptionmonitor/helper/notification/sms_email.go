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

func GetPhoneNumberByNS(owner string) (string, string, error) {
	outh, err := dao.CK.GetUserOauthProvider(&pkgtypes.UserQueryOpts{
		Owner: owner,
	})
	if err != nil {
		return "", "", err
	}
	var phone, email string
	for _, oauth := range outh {
		switch oauth.ProviderType {
		case pkgtypes.OauthProviderTypePhone:
			phone = oauth.ProviderID
		case pkgtypes.OauthProviderTypeEmail:
			email = oauth.ProviderID
		}
	}
	fmt.Println("phone:" + phone)
	fmt.Println("email:" + email)

	if phone == "" && email == "" {
		return "", "", errors.New("user phone && email are not set, skip sms notification")
	}
	return phone, email, nil
}

func SendExceptionNotification(notificationInfo *api.Info, clusterName, content string) error {
	name := strings.ReplaceAll(notificationInfo.DatabaseClusterName, "-", "/")
	owner, err := GetNSOwner(notificationInfo.Namespace)
	if err != nil {
		return err
	}

	phoneNumbers, userEmail, err := GetPhoneNumberByNS(owner)
	if err != nil {
		return err
	}

	if phoneNumbers != "" {
		fmt.Println(phoneNumbers)
		err := SendToSms(clusterName, content, phoneNumbers, name)
		if err != nil {
			fmt.Println("Error sending SMS:", err)
		}
	}
	if userEmail != "" {
		fmt.Println(userEmail)
		err := SendToEmail(clusterName, content, userEmail, name)
		if err != nil {
			fmt.Println("Error sending Email:", err)
		}
	}
	return nil
}

func SendToSms(clusterName, content, phoneNumbers, name string) error {
	smsClient, err := utils.CreateSMSClient(
		os.Getenv("SMSAccessKeyID"),
		os.Getenv("SMSAccessKeySecret"),
		os.Getenv("SMSEndpoint"),
	)
	if err != nil {
		return err
	}

	message := constructMessage(clusterName, content, name, "phone")
	err = utils.SendSms(smsClient, &client.SendSmsRequest{
		PhoneNumbers:  tea.String(phoneNumbers),
		SignName:      tea.String(os.Getenv("SMS_SIGN_NAME")),
		TemplateCode:  tea.String(os.Getenv("SMS_CODE")),
		TemplateParam: tea.String(message),
	})
	if err != nil {
		return err
	}
	fmt.Println("SMS sent to:", phoneNumbers, "Message:", message)
	return nil
}

func SendToEmail(clusterName, content, userEmail, name string) error {
	message := constructMessage(clusterName, content, name, "email")
	emailConfig := utils.SMTPConfig{
		ServerHost: "smtp.feishu.cn",
		ServerPort: 465,
		FromEmail:  "noreply@sealos.io",
		Passwd:     "EribJHnuEqGKDn8W",
		EmailTitle: "【 Sealos Cloud 】",
	}
	err := emailConfig.SendEmail(message, userEmail)
	if err != nil {
		return err
	}
	fmt.Println("Email sent to:", userEmail, "Message:", message)
	return nil
}

func constructMessage(clusterName, content, name, sendType string) string {
	if sendType == "phone" {
		return fmt.Sprintf(
			"{\"type\":\"数据库\",\"name\":\"%s\",\"region\":\"%s\",\"content\":\"%s\"}",
			name,
			api.ClusterRegionMap[clusterName],
			content,
		)
	}
	if sendType == "email" {
		return fmt.Sprintf("【Sealos Cloud】您好！\n\n"+
			"您的数据库实例 %s（区域: %s）发生告警。\n"+
			"告警内容：%s\n\n"+
			"请及时处理以确保应用的正常运行。如有任何疑问，请提交工单技术支持，感谢您的理解与配合！",
			name, api.ClusterRegionMap[clusterName], content)
	}
	return ""
}

func GetNSOwner(namespace string) (string, error) {
	ns, err := api.ClientSet.CoreV1().
		Namespaces().
		Get(context.Background(), namespace, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	return ns.Labels[api.OwnerLabel], nil
}
