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

package logger

import (
	"testing"
)

// Try each log level in decreasing order of priority.
func testConsoleCalls(bl *LocalLogger) {
	bl.Emer("emergency")
	bl.Alert("alert")
	bl.Crit("critical")
	bl.Error("error")
	bl.Warn("warning")
	bl.Debug("notice")
	bl.Info("informational")
	bl.Trace("trace")
}

func TestConsole(t *testing.T) {
	log1 := NewLogger()
	_ = log1.SetLogger("console", "")
	testConsoleCalls(log1)

	log2 := NewLogger()
	_ = log2.SetLogger("console", `{"level":"EROR"}`)
	testConsoleCalls(log2)
}

// Test console without color
func TestNoColorConsole(t *testing.T) {
	log := NewLogger()
	_ = log.SetLogger("console", `{"color":false}`)
	testConsoleCalls(log)
}
