package notification

import (
	"fmt"
	"net/smtp"

	"github.com/labring/sealos/service/notification/types"
)

type Email struct {
}

func (e *Email) SendMessage(message *types.Message, user *types.User, ops types.Options) error {
	return nil
}

func sendMail(smtpServer, smtpPort, from, password, to string, message []byte) error {
	addr := fmt.Sprintf("%s:%s", smtpServer, smtpPort)
	auth := smtp.PlainAuth("", from, password, smtpServer)
	err := smtp.SendMail(addr, auth, from, []string{to}, message)
	if err != nil {
		return err
	}
	return nil
}
