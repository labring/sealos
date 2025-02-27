// Copyright 2019 Intel Corporation. All Rights Reserved.
// Copyright 2019 Sealer Corporation.
// Copyright 2022 sealos Corporation
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

package server

import (
	"fmt"
	"net"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"time"

	dockertype "github.com/docker/docker/api/types"
	"google.golang.org/grpc"
	k8sv1api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
	netutil "github.com/labring/sealos/pkg/utils/net"
)

type Options struct {
	Timeout time.Duration
	// Socket is the socket where shim listens on
	Socket string
	// User is the user ID for our gRPC socket.
	User int
	// Group is the group ID for our gRPC socket.
	Group int
	// Mode is the permission mode bits for our gRPC socket.
	Mode os.FileMode
	//CRIConfigs is cri config for auth
	CRIConfigs        map[string]dockertype.AuthConfig
	OfflineCRIConfigs map[string]dockertype.AuthConfig
}

type Server interface {
	RegisterImageService(conn *grpc.ClientConn) error

	Chown(uid, gid int) error

	Chmod(mode os.FileMode) error

	Start() error

	Stop()
}

type server struct {
	server        *grpc.Server
	imageV1Client k8sv1api.ImageServiceClient
	options       Options
	listener      net.Listener // socket our gRPC server listens on
}

// RegisterImageService registers an image service with the server.
func (s *server) RegisterImageService(conn *grpc.ClientConn) error {
	if s.imageV1Client != nil {
		return serverError("can't register image service, already registered")
	}

	s.setupImageServiceClients(conn)

	if err := s.createGrpcServer(); err != nil {
		return err
	}

	k8sv1api.RegisterImageServiceServer(s.server, &v1ImageService{
		imageClient:       s.imageV1Client,
		CRIConfigs:        s.options.CRIConfigs,
		OfflineCRIConfigs: s.options.OfflineCRIConfigs,
	})

	return nil
}

func (s *server) Start() error {
	go func() {
		_ = s.server.Serve(s.listener)
	}()

	if err := netutil.WaitForServer(s.options.Socket, time.Second); err != nil {
		return serverError("starting CRI server failed: %v", err)
	}

	return nil
}

// createGrpcServer creates a gRPC server instance on our socket.
func (s *server) createGrpcServer() error {
	if s.server != nil {
		return nil
	}

	if err := os.MkdirAll(filepath.Dir(s.options.Socket), DirPermissions); err != nil {
		return serverError("failed to create directory for socket %s: %v",
			s.options.Socket, err)
	}

	l, err := net.Listen("unix", s.options.Socket)
	if err != nil {
		if netutil.ServerActiveAt(s.options.Socket) {
			return serverError("failed to create server: socket %s already in use",
				s.options.Socket)
		}
		os.Remove(s.options.Socket)
		l, err = net.Listen("unix", s.options.Socket)
		if err != nil {
			return serverError("failed to create server on socket %s: %v",
				s.options.Socket, err)
		}
	}

	s.listener = l

	if s.options.User >= 0 {
		if err := s.Chown(s.options.User, s.options.Group); err != nil {
			l.Close()
			s.listener = nil
			return err
		}
	}

	if s.options.Mode != 0 {
		if err := s.Chmod(s.options.Mode); err != nil {
			l.Close()
			s.listener = nil
			return err
		}
	}

	// nosemgrep: go.grpc.security.grpc-server-insecure-connection.grpc-server-insecure-connection
	s.server = grpc.NewServer()

	return nil
}

// Chmod changes the permissions of the server's socket.
func (s *server) Chmod(mode os.FileMode) error {
	if s.listener != nil {
		if err := os.Chmod(s.options.Socket, mode); err != nil {
			return serverError("failed to change permissions of socket %q to %v: %v",
				s.options.Socket, mode, err)
		}
		logger.Info("changed permissions of socket %q to %v", s.options.Socket, mode)
	}

	s.options.Mode = mode

	return nil
}

// Chown changes ownership of the server's socket.
func (s *server) Chown(uid, gid int) error {
	if s.listener != nil {
		userName := strconv.FormatInt(int64(uid), 10)
		if u, err := user.LookupId(userName); u != nil && err == nil {
			userName = u.Name
		}
		groupName := strconv.FormatInt(int64(gid), 10)
		if g, err := user.LookupGroupId(groupName); g != nil && err == nil {
			groupName = g.Name
		}
		if err := os.Chown(s.options.Socket, uid, gid); err != nil {
			return serverError("failed to change ownership of socket %q to %s/%s: %v",
				s.options.Socket, userName, groupName, err)
		}
		logger.Info("changed ownership of socket %q to %s/%s", s.options.Socket, userName, groupName)
	}

	s.options.User = uid
	s.options.Group = gid

	return nil
}

func (s *server) Stop() {
	logger.Info("stopping server on socket %s...", s.options.Socket)
	s.server.Stop()
}

func NewServer(options Options) (Server, error) {
	if !filepath.IsAbs(options.Socket) {
		return nil, fmt.Errorf("invalid socked")
	}

	s := &server{
		options: options,
	}
	return s, nil
}

// Return a formatter server error.
func serverError(format string, args ...interface{}) error {
	return fmt.Errorf("cri/server: "+format, args...)
}

func (s *server) setupImageServiceClients(conn *grpc.ClientConn) {
	s.imageV1Client = k8sv1api.NewImageServiceClient(conn)
}
