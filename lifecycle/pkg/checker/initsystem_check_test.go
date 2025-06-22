/*
Copyright 2022 cuisongliu@qq.com.

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

package checker

import (
	"testing"

	"github.com/stretchr/testify/assert"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/initsystem"
)

type mockInitSystem struct {
	exists  bool
	enabled bool
	active  bool
}

func (m *mockInitSystem) ServiceExists(name string) bool {
	return m.exists
}

func (m *mockInitSystem) ServiceIsEnabled(name string) bool {
	return m.enabled
}

func (m *mockInitSystem) ServiceIsActive(name string) bool {
	return m.active
}

func (m *mockInitSystem) EnableCommand(name string) string {
	return "systemctl enable " + name
}

func (m *mockInitSystem) ServiceEnable(name string) error {
	return nil
}

func (m *mockInitSystem) ServiceRestart(name string) error {
	return nil
}

func (m *mockInitSystem) ServiceStart(name string) error {
	return nil
}

func (m *mockInitSystem) ServiceStop(name string) error {
	return nil
}

func TestInitSystemChecker_Check(t *testing.T) {
	tests := []struct {
		name     string
		phase    string
		wantErr  bool
		initMock initsystem.InitSystem
	}{
		{
			name:    "skip non-post phase",
			phase:   "pre",
			wantErr: false,
		},
		{
			name:  "post phase check",
			phase: "post",
			initMock: &mockInitSystem{
				exists:  true,
				enabled: true,
				active:  true,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &InitSystemChecker{}
			err := n.Check(&v2.Cluster{}, tt.phase)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestInitSystemChecker_Output(t *testing.T) {
	tests := []struct {
		name    string
		status  *InitSystemStatus
		wantErr bool
	}{
		{
			name: "normal output",
			status: &InitSystemStatus{
				Error: "Nil",
				ServiceList: []systemStatus{
					{
						Name:   "kubelet",
						Status: "Enable && Active",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "empty service list",
			status: &InitSystemStatus{
				Error:       "Nil",
				ServiceList: []systemStatus{},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &InitSystemChecker{}
			err := n.Output(tt.status)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestInitSystemChecker_checkInitSystem(t *testing.T) {
	tests := []struct {
		name     string
		initMock initsystem.InitSystem
		service  string
		want     string
	}{
		{
			name: "service exists and running",
			initMock: &mockInitSystem{
				exists:  true,
				enabled: true,
				active:  true,
			},
			service: "kubelet",
			want:    "Enable && Active",
		},
		{
			name: "service exists but disabled and inactive",
			initMock: &mockInitSystem{
				exists:  true,
				enabled: false,
				active:  false,
			},
			service: "kubelet",
			want:    "Disable && NotActive",
		},
		{
			name: "service does not exist",
			initMock: &mockInitSystem{
				exists: false,
			},
			service: "nonexistent",
			want:    "NotExists",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &InitSystemChecker{}
			got := n.checkInitSystem(tt.initMock, tt.service)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestNewInitSystemChecker(t *testing.T) {
	checker := NewInitSystemChecker()
	assert.NotNil(t, checker)
	_, ok := checker.(*InitSystemChecker)
	assert.True(t, ok)
}
