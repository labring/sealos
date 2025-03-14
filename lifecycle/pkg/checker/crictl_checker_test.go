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
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	executils "k8s.io/utils/exec"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type mockExec struct {
	mock.Mock
}

func (m *mockExec) Command(name string, args ...string) executils.Cmd {
	m.Called(name, args)
	return nil
}

func (m *mockExec) LookPath(file string) (string, error) {
	args := m.Called(file)
	return args.String(0), args.Error(1)
}

func (m *mockExec) RunBashCmd(cmd string) (string, error) {
	args := m.Called(cmd)
	return args.String(0), args.Error(1)
}

func TestCRICtlChecker_Check(t *testing.T) {
	mockExecer := &mockExec{}
	mockExecer.On("LookPath", "crictl").Return("/usr/bin/crictl", nil)

	tests := []struct {
		name    string
		cluster *v2.Cluster
		phase   string
		wantErr bool
	}{
		{
			name:    "non-post phase",
			cluster: &v2.Cluster{},
			phase:   "pre",
			wantErr: false,
		},
		{
			name:    "post phase",
			cluster: &v2.Cluster{},
			phase:   PhasePost,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &CRICtlChecker{}
			err := c.Check(tt.cluster, tt.phase)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCRICtlChecker_Output(t *testing.T) {
	tests := []struct {
		name    string
		status  *CRICtlStatus
		wantErr bool
	}{
		{
			name: "valid status",
			status: &CRICtlStatus{
				Config: map[string]string{
					"ShimSocket": "unix:///run/containerd/containerd.sock",
					"CRISocket":  "unix:///run/containerd/containerd.sock",
				},
				ImageList: []string{"nginx:latest"},
				ContainerList: []Container{
					{
						Container: "abc123",
						State:     "RUNNING",
						Name:      "test",
						Attempt:   1,
						PodName:   "test-pod",
					},
				},
				RegistryPullStatus:  "ok",
				ImageShimPullStatus: "ok",
				Error:               Nil,
			},
			wantErr: false,
		},
		{
			name:    "nil status",
			status:  nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &CRICtlChecker{}
			err := c.Output(tt.status)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNewCRICtlChecker(t *testing.T) {
	checker := NewCRICtlChecker()
	assert.NotNil(t, checker)
	assert.IsType(t, &CRICtlChecker{}, checker)
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
