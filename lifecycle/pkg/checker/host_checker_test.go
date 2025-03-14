// Copyright © 2025 sealos.
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

package checker

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

type mockExecer struct {
	cmdOutput map[string]string
	cmdError  map[string]error
}

func (m *mockExecer) CmdToString(ip, cmd, _ string) (string, error) {
	if err, ok := m.cmdError[ip+cmd]; ok {
		return "", err
	}
	return m.cmdOutput[ip+cmd], nil
}

func (m *mockExecer) Cmd(ip, cmd string) ([]byte, error) {
	output, err := m.CmdToString(ip, cmd, "")
	return []byte(output), err
}

func (m *mockExecer) CmdAsync(ip string, cmds ...string) error {
	cmd := cmds[0]
	_, err := m.CmdToString(ip, cmd, "")
	return err
}

func (m *mockExecer) CmdAsyncWithContext(ctx context.Context, ip string, cmds ...string) error {
	cmd := cmds[0]
	_, err := m.CmdToString(ip, cmd, "")
	return err
}

func (m *mockExecer) Copy(src, dst string, _ string) error {
	return nil
}

func (m *mockExecer) Fetch(src, dst string, _ string) error {
	return nil
}

func (m *mockExecer) Ping(ip string) error {
	return nil
}

func TestCheckHostnameUnique(t *testing.T) {
	tests := []struct {
		name    string
		ipList  []string
		output  map[string]string
		errors  map[string]error
		wantErr bool
	}{
		{
			name:    "unique hostnames",
			ipList:  []string{"192.168.1.1", "192.168.1.2"},
			output:  map[string]string{"192.168.1.1hostname": "host1", "192.168.1.2hostname": "host2"},
			wantErr: false,
		},
		{
			name:    "duplicate hostnames",
			ipList:  []string{"192.168.1.1", "192.168.1.2"},
			output:  map[string]string{"192.168.1.1hostname": "host1", "192.168.1.2hostname": "host1"},
			wantErr: true,
		},
		{
			name:    "command error",
			ipList:  []string{"192.168.1.1"},
			errors:  map[string]error{"192.168.1.1hostname": errors.New("connection failed")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &mockExecer{
				cmdOutput: tt.output,
				cmdError:  tt.errors,
			}
			err := checkHostnameUnique(m, tt.ipList)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCheckTimeSync(t *testing.T) {
	currentTime := time.Now().Unix()
	tests := []struct {
		name    string
		ipList  []string
		output  map[string]string
		errors  map[string]error
		wantErr bool
	}{
		{
			name:   "time in sync",
			ipList: []string{"192.168.1.1", "192.168.1.2"},
			output: map[string]string{
				"192.168.1.1date +%s": strconv.FormatInt(currentTime, 10),
				"192.168.1.2date +%s": strconv.FormatInt(currentTime, 10),
			},
			wantErr: false,
		},
		{
			name:   "time out of sync",
			ipList: []string{"192.168.1.1", "192.168.1.2"},
			output: map[string]string{
				"192.168.1.1date +%s": strconv.FormatInt(currentTime, 10),
				"192.168.1.2date +%s": strconv.FormatInt(currentTime+120, 10),
			},
			wantErr: true,
		},
		{
			name:    "command error",
			ipList:  []string{"192.168.1.1"},
			errors:  map[string]error{"192.168.1.1date +%s": errors.New("connection failed")},
			wantErr: true,
		},
		{
			name:   "invalid timestamp",
			ipList: []string{"192.168.1.1"},
			output: map[string]string{
				"192.168.1.1date +%s": "invalid",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &mockExecer{
				cmdOutput: tt.output,
				cmdError:  tt.errors,
			}
			err := checkTimeSync(m, tt.ipList)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCheckContainerd(t *testing.T) {
	tests := []struct {
		name    string
		ipList  []string
		output  map[string]string
		errors  map[string]error
		wantErr bool
	}{
		{
			name:    "containerd not installed",
			ipList:  []string{"192.168.1.1", "192.168.1.2"},
			errors:  map[string]error{"192.168.1.1containerd --version": errors.New("command not found"), "192.168.1.2containerd --version": errors.New("command not found")},
			wantErr: false,
		},
		{
			name:    "containerd installed",
			ipList:  []string{"192.168.1.1", "192.168.1.2"},
			output:  map[string]string{"192.168.1.1containerd --version": "containerd v1.6.0"},
			wantErr: true,
		},
		{
			name:    "command error",
			ipList:  []string{"192.168.1.1"},
			errors:  map[string]error{"192.168.1.1containerd --version": errors.New("connection failed")},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &mockExecer{
				cmdOutput: tt.output,
				cmdError:  tt.errors,
			}
			err := checkContainerd(m, tt.ipList)
			if tt.wantErr {
				assert.Error(t, err)
				if err != nil {
					assert.Contains(t, err.Error(), "please uninstall it first")
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNewIPsHostChecker(t *testing.T) {
	ips := []string{"192.168.1.1", "192.168.1.2"}
	checker := NewIPsHostChecker(ips)
	hostChecker, ok := checker.(*HostChecker)
	assert.True(t, ok)
	assert.Equal(t, ips, hostChecker.IPs)
}

func TestNewContainerdChecker(t *testing.T) {
	ips := []string{"192.168.1.1", "192.168.1.2"}
	checker := NewContainerdChecker(ips)
	containerdChecker, ok := checker.(*ContainerdChecker)
	assert.True(t, ok)
	assert.Equal(t, ips, containerdChecker.IPs)
}
