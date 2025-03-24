package utils

import "github.com/go-gomail/gomail"

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
