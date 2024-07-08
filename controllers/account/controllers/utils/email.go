// Copyright © 2024 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package utils

import (
	"fmt"

	"github.com/wneessen/go-mail"
)

type SMTPConfig struct {
	ServerHost string
	ServerPort int
	FromEmail  string
	Passwd     string
	EmailTitle string
}

func (c *SMTPConfig) SendEmail(emailBody, to string) error {
	msg := mail.NewMsg()
	if err := msg.To(to); err != nil {
		return fmt.Errorf("failed to set mail TO address: %w", err)
	}
	if err := msg.FromFormat(c.EmailTitle, c.FromEmail); err != nil {
		return fmt.Errorf("failed to set mail FROM address: %w", err)
	}
	msg.Subject(c.EmailTitle)
	msg.SetBodyString(mail.TypeTextHTML, emailBody)

	client, err := mail.NewClient(c.ServerHost, mail.WithPort(c.ServerPort),
		mail.WithUsername(c.FromEmail), mail.WithPassword(c.Passwd))
	if err != nil {
		return fmt.Errorf("failed to create mail client: %w", err)
	}
	return client.DialAndSend(msg)
}
