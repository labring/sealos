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

package shim

import (
	"os"
	"testing"
	"time"

	"github.com/labring/image-cri-shim/pkg/server"
	"github.com/labring/image-cri-shim/pkg/types"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type mockServer struct {
	startErr  error
	stopCalls int
}

func (m *mockServer) Start() error {
	return m.startErr
}

func (m *mockServer) Stop() {
	m.stopCalls++
}

func (m *mockServer) RegisterImageService(conn *grpc.ClientConn) error {
	return nil
}

func (m *mockServer) RegisterRuntimeService() {
}

func (m *mockServer) Chown(uid, gid int) error {
	return nil
}

func (m *mockServer) Chmod(mode os.FileMode) error {
	return nil
}

type mockClient struct {
	connectErr error
	closeCalls int
}

func (m *mockClient) Connect(opts server.ConnectOptions) (*grpc.ClientConn, error) {
	if m.connectErr != nil {
		return nil, m.connectErr
	}
	return &grpc.ClientConn{}, nil
}

func (m *mockClient) Close() {
	m.closeCalls++
}

func (m *mockClient) CheckConnection(opts server.ConnectOptions) error {
	return nil
}

func (m *mockClient) HasImageService() bool {
	return true
}

func (m *mockClient) HasRuntimeService() bool {
	return true
}

func TestNewShim(t *testing.T) {
	tests := []struct {
		name    string
		cfg     *types.Config
		auth    *types.ShimAuthConfig
		wantErr bool
	}{
		{
			name: "valid config",
			cfg: &types.Config{
				RuntimeSocket:   "/var/run/containerd/containerd.sock",
				ImageShimSocket: "/var/run/image-cri-shim.sock",
				Timeout:         metav1.Duration{Duration: 30 * time.Second},
			},
			auth:    &types.ShimAuthConfig{},
			wantErr: false,
		},
		{
			name: "disabled runtime socket",
			cfg: &types.Config{
				RuntimeSocket:   DisableService,
				ImageShimSocket: "/var/run/image-cri-shim.sock",
				Timeout:         metav1.Duration{Duration: 30 * time.Second},
			},
			auth:    &types.ShimAuthConfig{},
			wantErr: false,
		},
		{
			name: "invalid socket path",
			cfg: &types.Config{
				RuntimeSocket:   "",
				ImageShimSocket: "",
			},
			auth:    &types.ShimAuthConfig{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			shim, err := NewShim(tt.cfg, tt.auth)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, shim)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, shim)
			}
		})
	}
}

func TestShimSetup(t *testing.T) {
	tests := []struct {
		name      string
		cfg       *types.Config
		auth      *types.ShimAuthConfig
		client    *mockClient
		server    *mockServer
		wantErr   bool
		setupFunc func(*shim)
	}{
		{
			name: "valid setup",
			cfg: &types.Config{
				RuntimeSocket:   "/var/run/containerd/containerd.sock",
				ImageShimSocket: "/var/run/image-cri-shim.sock",
				Timeout:         metav1.Duration{Duration: 30 * time.Second},
			},
			auth:    &types.ShimAuthConfig{},
			client:  &mockClient{},
			server:  &mockServer{},
			wantErr: false,
		},
		{
			name: "client connect error",
			cfg: &types.Config{
				RuntimeSocket:   "/var/run/containerd/containerd.sock",
				ImageShimSocket: "/var/run/image-cri-shim.sock",
				Timeout:         metav1.Duration{Duration: 30 * time.Second},
			},
			auth:    &types.ShimAuthConfig{},
			client:  &mockClient{connectErr: assert.AnError},
			server:  &mockServer{},
			wantErr: true,
		},
		{
			name: "disabled runtime",
			cfg: &types.Config{
				RuntimeSocket:   DisableService,
				ImageShimSocket: "/var/run/image-cri-shim.sock",
				Timeout:         metav1.Duration{Duration: 30 * time.Second},
			},
			auth:    &types.ShimAuthConfig{},
			client:  &mockClient{},
			server:  &mockServer{},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &shim{
				cfg:    tt.cfg,
				client: tt.client,
				server: tt.server,
			}

			if tt.setupFunc != nil {
				tt.setupFunc(s)
			}

			err := s.Setup()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestShimStartStop(t *testing.T) {
	tests := []struct {
		name    string
		server  *mockServer
		wantErr bool
	}{
		{
			name:    "successful start and stop",
			server:  &mockServer{},
			wantErr: false,
		},
		{
			name:    "start error",
			server:  &mockServer{startErr: assert.AnError},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &shim{
				client: &mockClient{},
				server: tt.server,
			}

			err := s.Start()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			s.Stop()
			assert.Equal(t, 1, tt.server.stopCalls)
		})
	}
}

func TestShimDialNotify(t *testing.T) {
	tests := []struct {
		name   string
		server *mockServer
		socket string
		uid    int
		gid    int
		mode   os.FileMode
		err    error
	}{
		{
			name:   "successful notification",
			server: &mockServer{},
			socket: "/test/socket",
			uid:    1000,
			gid:    1000,
			mode:   0660,
			err:    nil,
		},
		{
			name:   "error notification",
			server: &mockServer{},
			socket: "/test/socket",
			uid:    1000,
			gid:    1000,
			mode:   0660,
			err:    assert.AnError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &shim{
				server: tt.server,
			}
			s.dialNotify(tt.socket, tt.uid, tt.gid, tt.mode, tt.err)
		})
	}
}
