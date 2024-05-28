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
