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
	Build() map[string]any
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

func (e *EmailPayRender) Build() map[string]any {
	return map[string]any{
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

func (e *EmailSubRender) Build() map[string]any {
	build := map[string]any{
		"FirstName":            e.userInfo.FirstName,
		"LastName":             e.userInfo.LastName,
		"Domain":               e.Domain,
		"SubscriptionPlanName": e.SubscriptionPlanName,
		"StartDate":            e.StartDate.Format(time.DateOnly),
		"EndDate":              e.EndDate.Format(time.DateOnly),
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

	userName    string
	Domain      string
	Language    string // 语言: "zh" 或 "en"
	GraceReason []string
	Balance     int64 // 当前余额
}

type DebtGraceReason string

const (
	GraceReasonNoBalance  DebtGraceReason = "insufficient balance"
	GraceReasonSubExpired DebtGraceReason = "subscription expired"
)

func (e *EmailDebtRender) GetType() string {
	return e.Type
}

func (e *EmailDebtRender) SetUserName(userName string) {
	e.userName = userName
}

func (e *EmailDebtRender) SetLanguage(language string) {
	e.Language = language
}

func (e *EmailDebtRender) SetBalance(balance int64) {
	e.Balance = balance
}

func (e *EmailDebtRender) GetSubject() string {
	if e.Language == "zh" {
		return e.getSubjectZH()
	}
	return e.getSubjectEN()
}

func (e *EmailDebtRender) getSubjectEN() string {
	if types.ContainDebtStatus(types.DebtStates, e.CurrentStatus) {
		if e.CurrentStatus == types.FinalDeletionPeriod {
			return "Important: Your Resources Have Been Deleted"
		}
		return "Important: Your Account Has Entered Grace Period"
	}
	return "Low Account Balance Reminder"
}

func (e *EmailDebtRender) getSubjectZH() string {
	if types.ContainDebtStatus(types.DebtStates, e.CurrentStatus) {
		if e.CurrentStatus == types.FinalDeletionPeriod {
			return "重要提醒：您的资源已被删除"
		}
		return "重要提醒：您的账户已进入宽限期"
	}
	return "账户余额不足提醒"
}

func (e *EmailDebtRender) Build() map[string]any {
	balanceInUnits := float64(e.Balance) / 1000000.0

	build := map[string]any{
		"Type":           e.Type,
		"FirstName":      e.userName, // 使用 userName 作为 FirstName
		"LastName":       "",         // 留空
		"Domain":         e.Domain,
		"GraceReason":    e.GraceReason,
		"Language":       e.Language,
		"IsCNY":          e.Language == "zh",
		"Balance":        e.Balance,      // 原始值（兼容旧代码）
		"BalanceInUnits": balanceInUnits, // 格式化后的值
	}
	if e.Type == "CriticalBalancePeriod" {
		build["CreditsAvailable"] = "1"
	}
	if e.Type == "LowBalancePeriod" {
		build["CreditsAvailable"] = "5"
	}
	return build
}

// DebtEmailTemplateEN 标准英文债务邮件模板
const DebtEmailTemplateEN = `<!DOCTYPE html>
<html lang="en" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px;">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sealos - Account Balance Notification</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px;">
        <table class="container" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; max-width: 600px; margin: 0 auto; color: #333; background-color: #fff; border: 1px solid #e5e5e5;">
            <tr>
                <td>
                    <table class="header" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; padding: 48px; padding-bottom: 20px; border-bottom: 1px dashed #e5e5e5; width: 100%;">
                        <tr>
                            <td>
                                <table class="logo-table" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; margin-bottom: 8px;">
                                    <tr>
                                        <td class="logo-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; vertical-align: middle;">
                                            <div class="logo-icon" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 40px; height: 40px; display: inline-block; vertical-align: middle; margin-right: 12px;">
                                                <img src="https://objectstorageapi.usw.sealos.io/3n31wssp-sealos-assets/sealos-logo@128.png" width="40" height="40" alt="Sealos Logo" style="box-sizing: border-box; font-family: system-ui, sans-serif; font-weight: normal; letter-spacing: 0.25px;">
                                            </div>
                                            <span class="logo-text" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 32px; font-weight: 600; margin: 0; color: #333; display: inline-block; vertical-align: middle;">Sealos</span>
                                        </td>
                                    </tr>
                                </table>
                                <p class="tagline" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 14px; color: #888; margin: 0;">
                                    Application-Centric Intelligent Cloud Operating System
                                </p>
                            </td>
                        </tr>
                    </table>

                    <table class="main-content" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; padding: 48px; padding-top: 0;">
                        <tr>
                            <td>
                                <h2 class="greeting" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 24px; font-weight: 600; margin: 48px 0 12px 0; color: #333;">
                                    {{if .FirstName}}Hi {{.FirstName}},{{else}}Hi,{{end}}
                                </h2>

                                {{if eq .Type "LowBalancePeriod"}}
                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    Your account balance is running low. You have <strong>${{printf "%.2f" .BalanceInUnits}} USD</strong> in credits remaining.
                                </p>
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    To avoid any service disruption, please consider topping up your account soon. Your resources will continue to function normally, but we recommend maintaining a sufficient balance.
                                </p>
                                {{end}}

                                {{if eq .Type "CriticalBalancePeriod"}}
                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #dc2626; background-color: #fef2f2; border-radius: 8px; line-height: 1.44; padding: 16px;">
                                    <strong>⚠️ Critical: Your account balance is critically low.</strong><br>
                                    You have <strong>${{printf "%.2f" .BalanceInUnits}} USD</strong> in credits remaining.
                                </p>
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    Please top up your account as soon as possible to prevent service suspension. Your resources may be affected if the balance reaches zero.
                                </p>
                                {{end}}

                                {{if or (eq .Type "DebtPeriod") (eq .Type "DebtDeletionPeriod") (eq .Type "FinalDeletionPeriod")}}
                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #dc2626; background-color: #fef2f2; border-radius: 8px; line-height: 1.44; padding: 16px;">
                                    <strong>⚠️ Important: Your account has entered the grace period.</strong><br>
                                    {{range .GraceReason}}
                                    - {{.}}<br>
                                    {{end}}
                                </p>
                                {{end}}

                                {{if eq .Type "DebtPeriod"}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    Your services have been suspended. To restore your account and prevent data loss, please top up your account immediately. You have <strong>7 days</strong> from today before your resources will be permanently deleted.
                                </p>
                                {{end}}

                                {{if eq .Type "DebtDeletionPeriod"}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    This is a final reminder. Your resources will be permanently deleted <strong>within 7 days</strong>. Please take immediate action to recover your account and prevent permanent data loss.
                                </p>
                                {{end}}

                                {{if eq .Type "FinalDeletionPeriod"}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    Your resources have been permanently deleted due to prolonged account inactivity and insufficient balance. We're sorry to see you go. If you wish to use Sealos services again in the future, you can start a new subscription at any time.
                                </p>
                                {{end}}

                                <p class="footer-support" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    Should you have any questions, feel free to contact our support team.
                                </p>
                                <p class="footer-signature" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    Best regards,<br>
                                    The Sealos Team
                                </p>
                                <p class="footer-contact" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    <a href="mailto:contact@sealos.io" style="color: #2563EB; text-decoration: none;">contact@sealos.io</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`

// DebtEmailTemplateZH 标准中文债务邮件模板
const DebtEmailTemplateZH = `<!DOCTYPE html>
<html lang="zh-CN" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px;">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sealos - 账户余额通知</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px;">
        <table class="container" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; max-width: 600px; margin: 0 auto; color: #333; background-color: #fff; border: 1px solid #e5e5e5;">
            <tr>
                <td>
                    <table class="header" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; padding: 48px; padding-bottom: 20px; border-bottom: 1px dashed #e5e5e5; width: 100%;">
                        <tr>
                            <td>
                                <table class="logo-table" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; margin-bottom: 8px;">
                                    <tr>
                                        <td class="logo-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; vertical-align: middle;">
                                            <div class="logo-icon" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 40px; height: 40px; display: inline-block; vertical-align: middle; margin-right: 12px;">
                                                <img src="https://objectstorageapi.usw.sealos.io/3n31wssp-sealos-assets/sealos-logo@128.png" width="40" height="40" alt="Sealos Logo" style="box-sizing: border-box; font-family: system-ui, sans-serif; font-weight: normal; letter-spacing: 0.25px;">
                                            </div>
                                            <span class="logo-text" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 32px; font-weight: 600; margin: 0; color: #333; display: inline-block; vertical-align: middle;">Sealos</span>
                                        </td>
                                    </tr>
                                </table>
                                <p class="tagline" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 14px; color: #888; margin: 0;">
                                    以应用为中心的云操作系统
                                </p>
                            </td>
                        </tr>
                    </table>

                    <table class="main-content" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; padding: 48px; padding-top: 0;">
                        <tr>
                            <td>
                                <h2 class="greeting" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 24px; font-weight: 600; margin: 48px 0 12px 0; color: #333;">
                                    {{if .FirstName}}您好 {{.FirstName}}，{{else}}您好，{{end}}
                                </h2>

                                {{if eq .Type "LowBalancePeriod"}}
                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    您的账户余额不足。您当前的余额为 <strong>{{printf "%.2f" .BalanceInUnits}} 元</strong>。
                                </p>
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    为避免影响您的正常使用，请及时充值。您的资源目前可以正常使用，但我们建议保持充足的余额以确保服务稳定。
                                </p>
                                {{end}}

                                {{if eq .Type "CriticalBalancePeriod"}}
                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #dc2626; background-color: #fef2f2; border-radius: 8px; line-height: 1.44; padding: 16px;">
                                    <strong>⚠️ 紧急提醒：您的账户余额即将耗尽。</strong><br>
                                    您当前的余额为 <strong>{{printf "%.2f" .BalanceInUnits}} 元</strong>。
                                </p>
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    请尽快充值以防止服务暂停。如果余额归零，您的资源可能会受到影响。
                                </p>
                                {{end}}

                                {{if or (eq .Type "DebtPeriod") (eq .Type "DebtDeletionPeriod") (eq .Type "FinalDeletionPeriod")}}
                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #dc2626; background-color: #fef2f2; border-radius: 8px; line-height: 1.44; padding: 16px;">
                                    <strong>⚠️ 重要提醒：您的账户已进入宽限期。</strong><br>
                                    {{range .GraceReason}}
                                    - {{.}}<br>
                                    {{end}}
                                </p>
                                {{end}}

                                {{if eq .Type "DebtPeriod"}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    您的服务已被暂停。要恢复账户并防止数据丢失，请立即充值。从今天起，您有 <strong>7 天</strong> 的时间来恢复账户，之后您的资源将被永久删除。
                                </p>
                                {{end}}

                                {{if eq .Type "DebtDeletionPeriod"}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    这是最后提醒。您的资源将在 <strong>7 天内</strong> 被永久删除。请立即采取措施恢复您的账户，防止永久性数据丢失。
                                </p>
                                {{end}}

                                {{if eq .Type "FinalDeletionPeriod"}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    由于账户长期处于非活跃状态且余额不足，您的资源已被永久删除。很遗憾未能继续为您服务。如果您将来希望再次使用 Sealos 服务，可以随时开始新的订阅。
                                </p>
                                {{end}}

                                <p class="footer-support" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    如有任何疑问，欢迎联系我们的支持团队。
                                </p>
                                <p class="footer-signature" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    祝好，<br>
                                    Sealos 团队
                                </p>
                                <p class="footer-contact" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    <a href="mailto:contact@sealos.io" style="color: #2563EB; text-decoration: none;">contact@sealos.io</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`

// GetDebtEmailTemplate 根据语言返回对应的邮件模板
func GetDebtEmailTemplate(language string) string {
	if language == "zh" {
		return DebtEmailTemplateZH
	}
	return DebtEmailTemplateEN
}
