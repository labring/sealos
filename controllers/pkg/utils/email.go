package utils

import (
	"strconv"
	"time"

	"github.com/go-gomail/gomail"
	"github.com/labring/sealos/controllers/pkg/types"
)

type SMTPConfig struct {
	ServerHost string
	ServerPort int
	FromEmail  string
	Passwd     string
	EmailTitle string
}

func (c *SMTPConfig) SendEmail(emailBody, to string) error {
	m := gomail.NewMessage()
	m.SetHeader("To", to)
	m.SetAddressHeader("From", c.FromEmail, c.EmailTitle)
	m.SetHeader("Subject", c.EmailTitle)
	m.SetBody("text/html", emailBody)
	d := gomail.NewDialer(c.ServerHost, c.ServerPort, c.FromEmail, c.Passwd)
	return d.DialAndSend(m)
}

const (
	EnvSMTPHost     = "SMTP_HOST"
	EnvSMTPPort     = "SMTP_PORT"
	EnvSMTPFrom     = "SMTP_FROM"
	EnvSMTPPassword = "SMTP_PASSWORD"
	EnvSMTPTitle    = "SMTP_TITLE"

	EnvPaySuccessEmailTmpl = "PAY_SUCCESS_EMAIL_TMPL"
	EnvPayFailedEmailTmpl  = "PAY_FAILED_EMAIL_TMPL"
	EnvSubSuccessEmailTmpl = "SUB_SUCCESS_EMAIL_TMPL"
	EnvSubFailedEmailTmpl  = "SUB_FAILED_EMAIL_TMPL"
)

type EmailRenderBuilder interface {
	Build() map[string]interface{}
	GetType() string
	SetUserInfo(userInfo *types.UserInfo)
}

type EmailPayRender struct {
	Type           string
	userInfo       *types.UserInfo
	Domain         string
	TopUpAmount    int64
	AccountBalance int64
}

func (e *EmailPayRender) Build() map[string]interface{} {
	return map[string]interface{}{
		"FirstName":      e.userInfo.FirstName,
		"LastName":       e.userInfo.LastName,
		"Domain":         e.Domain,
		"TopUpAmount":    strconv.FormatInt(e.TopUpAmount, 10),
		"AccountBalance": strconv.FormatInt(e.AccountBalance, 10),
	}
}

func (e *EmailPayRender) GetType() string {
	return e.Type
}

func (e *EmailPayRender) SetUserInfo(userInfo *types.UserInfo) {
	e.userInfo = userInfo
}

func (e *EmailSubRender) Build() map[string]interface{} {

	build := map[string]interface{}{
		"FirstName":            e.userInfo.FirstName,
		"LastName":             e.userInfo.LastName,
		"Domain":               e.Domain,
		"SubscriptionPlanName": e.SubscriptionPlanName,
		"StartDate":            e.StartDate.Format("2006-01-02"),
		"EndDate":              e.EndDate.Format("2006-01-02"),
	}
	switch e.SubscriptionPlanName {
	case "Hobby":
		build["SubscriptionFeatures"] = []string{
			"Includes $5 credits",
			"16 vCPU / 32GiB RAM",
			"Unlimited disk & traffic within plan",
			"Multiple regions",
			"3 workspaces / region",
			"5 seats / workspace",
		}
	case "Pro":
		build["SubscriptionFeatures"] = []string{
			"Includes $20 credits",
			"128 vCPU / 256GiB RAM",
			"Unlimited disk & traffic within plan",
			"Multiple regions",
			"Multiple workspace / region",
			"Multiple seat / workspace",
		}
	}
	return build
}

/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawCloud Subscription Activated</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"
          style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(270deg, #2778FD 3.93%, #2778FD 18.25%, #829DFE 80.66%);
             height: 120px;
             text-align: center;
             vertical-align: middle;
             padding: 20px 0;">
              <img src="https://us-east-1.run.claw.cloud/clawcloud.png" alt="ClawCloud Logo" width="217" height="auto"
                style="display: inline-block;">
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 48px;">
              <h2 style="margin: 0; font-size: 28px; color: #000; font-weight: 700;">Dear {{.FirstName}} {{.LastName}}
              </h2>
              <p style="margin: 12px 0px 24px 0px; font-size: 16px; color: #000; line-height: 1.6;">
                Congratulations!<br>
                Your {{.SubscriptionPlanName}} has been successfully activated. Below are the details of your
                subscription:
              </p>
              <div style="margin: 24px 0;
              padding: 24px;
              border-radius: 12px;
              border: 1px solid #E4E4E7;
              background: #FFF;
              box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
              ">
                <h3 style="margin: 0 0 10px 0; font-size: 24px; color: #4285f4; font-weight: 700; position: relative;">
                  {{.SubscriptionPlanName}}<span
                    style="position: absolute; top: 0; margin-left: 5px; font-size: 20px; color: #4285f4;">✧</span>
                </h3>
                <div
                  style="font-size: 16px; color: #666; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                  from {{.StartDate}} - {{.EndDate}}
                </div>
                {{- range $index, $feature := .SubscriptionFeatures }}
                <div
                  style="display: flex; align-items: center; {{ if ne $index (sub (len $.SubscriptionFeatures) 1) }}margin-bottom: 12px;{{ end }} gap: 8px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <g clip-path="url(#clip0_741_51174)">
                      <path
                        d="M6.00016 8.00016L7.3335 9.3335L10.0002 6.66683M14.6668 8.00016C14.6668 11.6821 11.6821 14.6668 8.00016 14.6668C4.31826 14.6668 1.3335 11.6821 1.3335 8.00016C1.3335 4.31826 4.31826 1.3335 8.00016 1.3335C11.6821 1.3335 14.6668 4.31826 14.6668 8.00016Z"
                        stroke="black" stroke-opacity="0.4" stroke-width="1.33" stroke-linecap="round"
                        stroke-linejoin="round" />
                    </g>
                    <defs>
                      <clipPath id="clip0_741_51174">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  <div style="font-size: 16px; color: #333;">{{ $feature }}</div>
                </div>
                {{- end }}
              </div>
              <p style="margin: 20px 0 0; font-size: 16px; font-weight: 400; color: #000; line-height: 1.6;">
                If you have any questions, please feel free to contact our support team.
              </p>
              <p style="margin: 30px 0 0; font-size: 18px; color: #000; font-weight: 700;">
                Thank you for choosing us!
              </p>
              <p style="margin: 5px 0 0; font-size: 14px; color: #000;">
                Clawcloud (Singapore) Private Limited<br>
                support@run.claw.cloud
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
*/

type EmailSubRender struct {
	Type string

	userInfo types.UserInfo
	Domain   string

	SubscriptionPlanName string
	StartDate            time.Time
	EndDate              time.Time
}

func (e *EmailSubRender) GetType() string {
	return e.Type
}

func (e *EmailSubRender) SetUserInfo(userInfo *types.UserInfo) {
	e.userInfo = *userInfo
}
