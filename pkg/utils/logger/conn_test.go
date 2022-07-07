// Copyright © 2021 github.com/wonderivan/logger
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
	"fmt"
	"net"
	"testing"
)

func TestConn(t *testing.T) {
	testPort, l, err := createTestServer()
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()

	netAddr := fmt.Sprintf(`{"net":"tcp","addr":"localhost:%d"}`, testPort)

	log := NewLogger()
	log.SetLogger(AdapterConn, netAddr)
	log.Info("this is informational to net")
	log.SetLogger(AdapterConn, netAddr)
	log.Debug("this is informational to net")
	log.Info("this is informational to net")
	log.Warn("this is informational to net")
}

func createTestServer() (int, *net.TCPListener, error) {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	if err != nil {
		return 0, nil, err
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, nil, err
	}
	return l.Addr().(*net.TCPAddr).Port, l, nil
}
