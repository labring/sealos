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

package logger_test

import (
	"errors"
	"os"
	"os/exec"
	"testing"

	"github.com/labring/sealos/pkg/utils/logger"
)

func TestInfoLog(t *testing.T) {
	logger.CfgConsoleLogger(false, false)

	logger.Info("can see me")
	logger.Debug("cannot see me")

	logDir := t.TempDir()
	logger.CfgConsoleAndFileLogger(true, logDir, "log_test.log", true)

	logger.Info("can see me")
	logger.Debug("cannot see me")
	logger.Warn("this is warn")
	logger.Error("this is error: %s", errors.New("this is error"))
	logger.Error("info %% is dead", errors.New("this is error"), 2)
	logger.Error(errors.New("this is error"))
	logger.Error(errors.New("this is error"), "more error")

	if logger.IsDebugMode() == false {
		t.Error("not in debug mode")
	}
}

func TestFatalLog(t *testing.T) {
	if os.Getenv("LOG_FATAL") == "1" {
		logger.Fatal("this is fatal")
		return
	}
	//nolint:gosec
	cmd := exec.Command(os.Args[0], "-test.run=TestFatalLog")
	cmd.Env = append(os.Environ(), "LOG_FATAL=1")
	err := cmd.Run()
	e := &exec.ExitError{}
	if errors.As(err, &e) {
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
	logger.Panic("this panics")
}
