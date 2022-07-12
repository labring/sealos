// Copyright © 2022 sealos.
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

package logger

import (
	"errors"
	"os"
	"os/exec"
	"testing"
)

func TestInfoLog(t *testing.T) {
	CfgConsoleLogger(false, false)

	Info("can see me")
	Debug("cannot see me")

	logDir := t.TempDir()
	CfgConsoleAndFileLogger(true, logDir, "log_test.log", true)

	Info("can see me")
	Debug("cannot see me")
	Warn("this is warn")
	Error("this is error: %s", errors.New("this is error"))
	Error("info %% is dead", errors.New("this is error"), 2)
	Error(errors.New("this is error"))
	Error(errors.New("this is error"), "more error")

	if IsDebugMode() == false {
		t.Error("not in debug mode")
	}
}

func TestFatalLog(t *testing.T) {
	if os.Getenv("LOG_FATAL") == "1" {
		Fatal("this is fatal")
		return
	}
	cmd := exec.Command(os.Args[0], "-test.run=TestFatalLog")
	cmd.Env = append(os.Environ(), "LOG_FATAL=1")
	err := cmd.Run()
	if e, ok := err.(*exec.ExitError); ok && !e.Success() {
		return
	}
	t.Fatalf("process ran with err %v, want exit status 1", err)
}

func TestPanicLog(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("The code did not panic")
		}
	}()
	Panic("this panics")
}
