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
	"fmt"
	"io"
	"strings"
	"sync"

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
	strings2 "github.com/labring/sealos/pkg/utils/strings"
)

func (s *SSH) Ping(host string) error {
	if s.isLocalAction(host) {
		logger.Debug("host %s is local, ping is always true", host)
		return nil
	}
	client, _, err := s.Connect(host)
	if err != nil {
		return fmt.Errorf("[ssh %s]create ssh session failed, %v", host, err)
	}
	err = client.Close()
	if err != nil {
		return err
	}
	return nil
}

func (s *SSH) CmdAsync(host string, cmds ...string) error {
	var isLocal bool
	if s.isLocalAction(host) {
		logger.Debug("host %s is local, command via exec", host)
		isLocal = true
	}
	for _, cmd := range cmds {
		if cmd == "" {
			continue
		}

		if err := func(cmd string) error {
			if isLocal {
				return exec.Cmd("bash", "-c", cmd)
			}
			client, session, err := s.Connect(host)
			if err != nil {
				return fmt.Errorf("failed to create ssh session for %s: %v", host, err)
			}
			defer client.Close()
			defer session.Close()
			stdout, err := session.StdoutPipe()
			if err != nil {
				return fmt.Errorf("failed to create stdout pipe for %s: %v", host, err)
			}
			stderr, err := session.StderrPipe()
			if err != nil {
				return fmt.Errorf("failed to create stderr pipe for %s: %v", host, err)
			}

			if err := session.Start(cmd); err != nil {
				return fmt.Errorf("failed to start command %s on %s: %v", cmd, host, err)
			}

			var combineSlice []string
			var combineLock sync.Mutex
			doneout := make(chan error, 1)
			doneerr := make(chan error, 1)
			go func() {
				doneerr <- readPipe(host, stderr, &combineSlice, &combineLock, s.isStdout)
			}()
			go func() {
				doneout <- readPipe(host, stdout, &combineSlice, &combineLock, s.isStdout)
			}()
			<-doneerr
			<-doneout

			err = session.Wait()
			if err != nil {
				return strings2.WrapExecResult(host, cmd, []byte(strings.Join(combineSlice, "\n")), err)
			}

			return nil
		}(cmd); err != nil {
			return err
		}
	}

	return nil
}

func (s *SSH) Cmd(host, cmd string) ([]byte, error) {
	if s.isLocalAction(host) {
		logger.Debug("host %s is local, command via exec", host)
		d, err := exec.RunBashCmd(cmd)
		return []byte(d), err
	}
	client, session, err := s.Connect(host)
	if err != nil {
		return nil, fmt.Errorf("failed to create ssh session for %s: %v", host, err)
	}
	defer client.Close()
	defer session.Close()
	output, err := session.CombinedOutput(cmd)
	if err != nil {
		err = fmt.Errorf("failed to run command: %v", err)
	}
	return output, err
}

func readPipe(host string, pipe io.Reader, combineSlice *[]string, combineLock *sync.Mutex, isStdout bool) error {
	r := bufio.NewReader(pipe)
	for {
		line, _, err := r.ReadLine()
		if err != nil {
			return err
		}

		combineLock.Lock()
		*combineSlice = append(*combineSlice, string(line))
		if isStdout {
			fmt.Printf("%s: %s\n", host, string(line))
		}
		combineLock.Unlock()
	}
}
