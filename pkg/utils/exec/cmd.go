// Copyright © 2021 sealos.
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

package exec

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/fanux/sealos/pkg/utils/logger"
	strutil "github.com/fanux/sealos/pkg/utils/strings"
)

func Cmd(name string, args ...string) error {
	cmd := exec.Command(name, args[:]...) // #nosec
	cmd.Stdin = os.Stdin
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout
	return cmd.Run()
}
func CmdForPipe(exe string, args ...string) error {
	cmd := exec.Command(exe, args...)
	outReader, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("error creating StdoutPipe for cmd: #%v", err)
	}

	errReader, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("error creating StderrPipe for cmd: #%v", err)
	}

	outScanner := bufio.NewScanner(outReader)
	go func() {
		for outScanner.Scan() {
			logger.Info(outScanner.Text())
		}
	}()

	errScanner := bufio.NewScanner(errReader)
	go func() {
		for errScanner.Scan() {
			logger.Info(errScanner.Text())
		}
	}()

	if err = cmd.Start(); err != nil {
		return fmt.Errorf("error starting cmd: #%v", err)
	}

	if err = cmd.Wait(); err != nil {
		return fmt.Errorf("error waiting for cmd: #%v", err)
	}

	return nil
}

func Output(name string, args ...string) ([]byte, error) {
	cmd := exec.Command(name, args[:]...) // #nosec
	return cmd.CombinedOutput()
}

func RunSimpleCmd(cmd string) (string, error) {
	result, err := exec.Command("/bin/sh", "-c", cmd).CombinedOutput() // #nosec
	return string(result), err
}

func RunBashCmd(cmd string) (string, error) {
	result, err := exec.Command("/bin/bash", "-c", cmd).CombinedOutput() // #nosec
	return string(result), err
}

func BashEval(cmd string) string {
	out, _ := RunBashCmd(cmd)
	return strutil.TrimWS(out)
}

func Eval(cmd string) string {
	out, _ := RunSimpleCmd(cmd)
	return strutil.TrimWS(out)
}

func CheckCmdIsExist(cmd string) (string, bool) {
	cmd = fmt.Sprintf("type %s", cmd)
	out, err := RunSimpleCmd(cmd)
	if err != nil {
		return "", false
	}

	outSlice := strings.Split(out, "is")
	last := outSlice[len(outSlice)-1]

	if last != "" && !strings.Contains(last, "not found") {
		return strings.TrimSpace(last), true
	}
	return "", false
}
