// Copyright © 2021 Alibaba Group Holding Ltd.
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

package ssh

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"
)

func (c *Client) Ping(host string) error {
	client, _, err := c.Connect(host)
	if err != nil {
		return fmt.Errorf("failed to connect %s: %v", host, err)
	}
	return client.Close()
}

func (c *Client) wrapCommands(cmds ...string) string {
	cmdJoined := strings.Join(cmds, "; ")
	if !c.Option.sudo || c.Option.user == defaultUsername {
		return cmdJoined
	}

	// Escape single quotes in cmd, fix https://github.com/labring/sealos/issues/4424
	// e.g. echo 'hello world' -> `sudo -E /bin/bash -c 'echo "hello world"'`
	cmdEscaped := strings.ReplaceAll(cmdJoined, `'`, `"`)
	return fmt.Sprintf("sudo -E /bin/bash -c '%s'", cmdEscaped)
}

func (c *Client) CmdAsyncWithContext(ctx context.Context, host string, cmds ...string) error {
	cmd := c.wrapCommands(cmds...)
	logger.Debug("start to exec `%s` on %s", cmd, host)
	client, session, err := c.Connect(host)
	if err != nil {
		return fmt.Errorf("connect error: %v", err)
	}
	defer client.Close()
	defer session.Close()
	stdout, err := session.StdoutPipe()
	if err != nil {
		return fmt.Errorf("stdout pipe %s: %v", host, err)
	}
	stderr, err := session.StderrPipe()
	if err != nil {
		return fmt.Errorf("stderr pipe %s: %v", host, err)
	}
	stdin, err := session.StdinPipe()
	if err != nil {
		return fmt.Errorf("stdin pipe %s: %v", host, err)
	}
	out := autoAnswerWriter{
		in:        stdin,
		answer:    []byte(c.password + "\n"),
		condition: isSudoPrompt,
	}
	eg, _ := errgroup.WithContext(context.Background())
	eg.Go(func() error { return c.handlePipe(host, stderr, &out, c.stdout) })
	eg.Go(func() error { return c.handlePipe(host, stdout, &out, c.stdout) })

	errCh := make(chan error, 1)
	go func() {
		errCh <- func() error {
			if err := session.Start(cmd); err != nil {
				return fmt.Errorf("start command `%s` on %s: %v", cmd, host, err)
			}
			if err = eg.Wait(); err != nil {
				return err
			}
			if err = session.Wait(); err != nil {
				return fmt.Errorf("run command `%s` on %s, output: %s, error: %v,", cmd, host, out.b.String(), err)
			}
			return nil
		}()
	}()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err = <-errCh:
		return err
	}
}

// CmdAsync not actually asynchronously, just print output asynchronously
func (c *Client) CmdAsync(host string, cmds ...string) error {
	ctx, cancel := GetTimeoutContext()
	defer cancel()
	return c.CmdAsyncWithContext(ctx, host, cmds...)
}

func (c *Client) Cmd(host, cmd string) ([]byte, error) {
	cmd = c.wrapCommands(cmd)
	logger.Debug("start to exec `%s` on %s", cmd, host)
	client, session, err := c.Connect(host)
	if err != nil {
		return nil, fmt.Errorf("failed to create ssh session for %s: %v", host, err)
	}
	defer client.Close()
	defer session.Close()
	in, err := session.StdinPipe()
	if err != nil {
		return nil, err
	}
	b := autoAnswerWriter{
		in:        in,
		answer:    []byte(c.password + "\n"),
		condition: isSudoPrompt,
	}
	session.Stdout = &b
	session.Stderr = &b
	err = session.Run(cmd)
	return b.b.Bytes(), err
}

type withPrefixWriter struct {
	prefix  string
	newline bool
	w       io.Writer
	mu      sync.Mutex
}

func (w *withPrefixWriter) Write(p []byte) (int, error) {
	p = append([]byte(w.prefix), p...)
	if w.newline {
		if p[len(p)-1] != byte('\n') {
			p = append(p, '\n')
		}
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.w.Write(p)
}

type autoAnswerWriter struct {
	b          bytes.Buffer
	in         io.Writer
	showPrompt bool
	answer     []byte
	condition  func([]byte) bool
	mu         sync.Mutex
}

func (w *autoAnswerWriter) Write(p []byte) (int, error) {
	if w.in != nil && w.condition != nil && w.condition(p) {
		_, err := w.in.Write(w.answer)
		if err != nil {
			return 0, err
		}
		if !w.showPrompt {
			return len(p), nil
		}
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.b.Write(p)
}

func isSudoPrompt(p []byte) bool {
	return bytes.HasPrefix(p, []byte("[sudo] password for ")) && bytes.HasSuffix(p, []byte(": "))
}

func (c *Client) handlePipe(host string, pipe io.Reader, out io.Writer, isStdout bool) error {
	r := bufio.NewReader(pipe)
	writers := []io.Writer{out}
	if isStdout {
		writers = append(writers, &withPrefixWriter{prefix: host + "\t", newline: true, w: os.Stdout})
	}
	w := io.MultiWriter(writers...)
	var line []byte
	for {
		b, err := r.ReadByte()
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
		line = append(line, b)
		if b == byte('\n') || isSudoPrompt(line) {
			// ignore any writer error
			_, _ = w.Write(line)
			line = make([]byte, 0)
			continue
		}
	}
}
