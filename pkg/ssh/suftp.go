/*
Copyright 2023 ghostloda

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package ssh

import (
	"fmt"
	"io"
	"strings"

	"github.com/pkg/errors"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

const (
	promptpwd      string = "sudo password"
	promptsuccess  string = "sudo success!"
	prompterror    string = "sudo failed!!"
	promptlength   int    = 13
	sshdConfigPath        = "/etc/ssh/sshd_config"
)

func NewSudoSftpClient(conn *ssh.Client, sudopwd string, opts ...sftp.ClientOption) (*sftp.Client, error) {
	s, err := conn.NewSession()
	if err != nil {
		return nil, err
	}

	sftpServerPath, err := getSftpServerPath(conn, sudopwd)
	if err != nil {
		return nil, err
	}

	// sudo -p specifies the password prompt from sudo. The prompt is sent to stderr
	// sudo -S dictates that password should be read from stdin
	// sudo -u specifies the user
	// sh -c 'cmd' passes cmd to sh
	// >&2 echo "%s" echos promptsucess to stderr before starting sftp server ( see https://stackoverflow.com/a/23550347 )
	// & %s is the final command to be executed is sudo is successful, which is the path to the sftp-server binary. It is a list of possible binary paths and it will pick the first one that exists. At the end, it will look in $PATH.
	// || sh -c '>&2 echo "%s" & exit 1' -> runs if sudo failed and ensures that prompterror is written to stderr before erroring
	// In total this means that we can read from stderr and write to stdin to
	cmd := fmt.Sprintf(
		`sudo -p '%s' -S sh -c '>&2 echo "%s" & %s' || sh -c '>&2 echo "%s" & exit 1'`,
		promptpwd+"\n",
		promptsuccess,
		sftpServerPath,
		prompterror,
	)

	stdin, err := s.StdinPipe()
	if err != nil {
		return nil, err
	}

	stdout, err := s.StdoutPipe()
	if err != nil {
		return nil, err
	}

	stderr, err := s.StderrPipe()
	if err != nil {
		return nil, err
	}

	err = s.Start(cmd)

	if err != nil {
		return nil, err
	}

	// Sudo might output a lecture, so looping for either password, error or success prompt
	prompt, err := getPrompt(stderr)
	if err != nil {
		return nil, errors.Wrap(err, "could not get err prompt")
	}

	switch prompt {
	case prompterror:
		return nil, errors.New("sudo failed")
	case promptpwd:
		// ignore any writer error
		_, _ = stdin.Write([]byte(sudopwd + "\n"))
	case promptsuccess:
		return sftp.NewClientPipe(stdout, stdin, opts...)
	}

	// Second read is only after pwd has been entered.
	// If it returns pwd prompt again, it means that it was the wrong password.
	// Error means the user is not allowed to sudo or something else went wrong.
	prompt, err = getPrompt(stderr)
	if err != nil {
		return nil, errors.Wrap(err, "second stderr read failed")
	}

	switch prompt {
	case prompterror:
		return nil, errors.New("sudo failed or no sudo rights")
	case promptpwd:
		return nil, fmt.Errorf("wrong sudo password")
	}

	return sftp.NewClientPipe(stdout, stdin, opts...)
}

// getPrompt is a handy method for reading a prompt from stderr
// prompt should be at the end of the read, minus a newline
func getPrompt(rd io.Reader) (string, error) {
	buf := make([]byte, 2048)

	var prompt string

	for {
		n, err := rd.Read(buf)
		if err != nil {
			return "", err
		}

		if n <= promptlength+1 {
			prompt = string(buf[:n-1])
		} else {
			prompt = string(buf[n-promptlength-1 : n-1])
		}

		if prompt == prompterror || prompt == promptpwd || prompt == promptsuccess {
			return prompt, nil
		}
	}
}

func getSftpServerPath(conn *ssh.Client, sudopwd string) (string, error) {
	ses, err := conn.NewSession()
	if err != nil {
		return "", err
	}
	defer ses.Close()

	cmd := fmt.Sprintf(`sudo -S grep -oP "Subsystem\s+sftp\s+\K.*" %s`, sshdConfigPath)
	in, err := ses.StdinPipe()
	if err != nil {
		return "", err
	}
	b := autoAnswerWriter{
		in:        in,
		answer:    []byte(sudopwd + "\n"),
		condition: isSudoPrompt,
	}
	ses.Stdout = &b
	ses.Stderr = &b
	err = ses.Run(cmd)
	if err != nil {
		return "", fmt.Errorf("failed to find sftp-server binary path on %s: %v", sshdConfigPath, err)
	}
	sftpServerPath := strings.ReplaceAll(b.b.String(), "\r", "")
	return sftpServerPath, nil
}
