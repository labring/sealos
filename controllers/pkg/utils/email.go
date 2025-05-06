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
	Username   string
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
	d := gomail.NewDialer(c.ServerHost, c.ServerPort, c.Username, c.Passwd)
	return d.DialAndSend(m)
}

func (c *SMTPConfig) SendEmailWithSubject(subject, emailBody, to string) error {
	m := gomail.NewMessage()
	m.SetHeader("To", to)
	m.SetAddressHeader("From", c.FromEmail, c.EmailTitle)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", emailBody)
	d := gomail.NewDialer(c.ServerHost, c.ServerPort, c.Username, c.Passwd)
	return d.DialAndSend(m)
}

const (
	EnvSMTPHost     = "SMTP_HOST"
	EnvSMTPPort     = "SMTP_PORT"
	EnvSMTPFrom     = "SMTP_FROM"
	EnvSMTPUser     = "SMTP_USER"
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
	GetSubject() string
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

func (e *EmailPayRender) GetSubject() string {
	return "Top-Up Successful"
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

type EmailSubRender struct {
	Type     string
	Operator types.SubscriptionOperator

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

func (e *EmailSubRender) GetSubject() string {
	switch e.Operator {
	case types.SubscriptionTransactionTypeUpgraded:
		return "Your Subscription Has Been Successfully Updated"
	case types.SubscriptionTransactionTypeDowngraded:
		return "Your Subscription Has Been Successfully Downgraded"
	case types.SubscriptionTransactionTypeCanceled:
		return "Your Subscription Has Been Successfully Canceled"
	case types.SubscriptionTransactionTypeRenewed:
		return "Your Subscription Has Been Successfully Renewed"
	default:
		return "Your Subscription Has Been Successfully Activated"
	}
}

type EmailDebtRender struct {
	Type          string
	CurrentStatus types.DebtStatusType

	userInfo    types.UserInfo
	Domain      string
	GraceReason []string
}

type DebtGraceReason string

const (
	GraceReasonNoBalance  DebtGraceReason = "insufficient balance"
	GraceReasonSubExpired DebtGraceReason = "subscription expired"
)

func (e *EmailDebtRender) GetType() string {
	return e.Type
}

func (e *EmailDebtRender) SetUserInfo(userInfo *types.UserInfo) {
	e.userInfo = *userInfo
}

func (e *EmailDebtRender) GetSubject() string {
	if types.ContainDebtStatus(types.DebtStates, e.CurrentStatus) {
		if e.CurrentStatus == types.FinalDeletionPeriod {
			return "Important: Your Resources Had Expired"
		}
		return "Important: Your Account Has Entered Grace Period"
	}
	return "Low Account Balance Reminder"
}

func (e *EmailDebtRender) Build() map[string]interface{} {
	build := map[string]interface{}{
		"FirstName":   e.userInfo.FirstName,
		"LastName":    e.userInfo.LastName,
		"Domain":      e.Domain,
		"GraceReason": e.GraceReason,
	}
	if e.Type == "CriticalBalancePeriod" {
		build["CreditsAvailable"] = "1"
	}
	if e.Type == "LowBalancePeriod" {
		build["CreditsAvailable"] = "5"
	}
	return build
}
