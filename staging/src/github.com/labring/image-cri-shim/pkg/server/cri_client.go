// Copyright 2019 Intel Corporation. All Rights Reserved.
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

//nolint:staticcheck
package server

import (
	"context"
	"fmt"
	"net"
	"os"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"

	netutil "github.com/labring/sealos/pkg/utils/net"
)

// DialNotifyFn is a function to call after a successful net.Dial[Timeout]().
type DialNotifyFn func(string, int, int, os.FileMode, error)

// CRIClientOptions contains the configurable options of our CRI client.
type CRIClientOptions struct {
	// ImageSocket is the socket path for the CRI image service.
	ImageSocket string
	// RuntimeSocket is the socket path for the CRI runtime service.
	RuntimeSocket string
	// DialNotify is an optional function to notify after net.Dial returns for a socket.
	DialNotify DialNotifyFn
}

// ConnectOptions contains options for connecting to the server.
type ConnectOptions struct {
	// Wait indicates whether Connect() should wait (indefinitely) for the server.
	Wait bool
	// Reconnect indicates whether CheckConnection() should attempt to Connect().
	Reconnect bool
}

// Client is the interface we expose to our CRI client.
type Client interface {
	// Connect tries to connect the client to the specified image and runtime services.
	Connect(ConnectOptions) (*grpc.ClientConn, error)
	// Close closes any existing client connections.
	Close()
	// CheckConnection checks if we have (un-Close()'d as opposed to working) connections.
	CheckConnection(ConnectOptions) error
	// HasRuntimeService checks if the client is configured with runtime services.
	HasRuntimeService() bool
	// HasImageService checks if the client is configured with image services.
	HasImageService() bool
}

// client is the implementation of Client.
type client struct {
	options CRIClientOptions // client options
	icc     *grpc.ClientConn // our gRPC connection to the image service
}

const (
	// DontConnect is used to mark a socket to not be connected.
	DontConnect = "-"
)

// NewClient creates a new client instance.
func NewClient(options CRIClientOptions) (Client, error) {
	if options.ImageSocket == DontConnect && options.RuntimeSocket == DontConnect {
		return nil, clientError("neither image nor runtime socket specified")
	}

	c := &client{
		options: options,
	}

	return c, nil
}

// Connect attempts to establish gRPC client connections to the configured services.
func (c *client) Connect(options ConnectOptions) (*grpc.ClientConn, error) {
	kind, socket := "image services", c.options.ImageSocket

	icc, err := c.connect(kind, socket, options)
	if err != nil {
		return nil, err
	}
	c.icc = icc

	return c.icc, nil
}

// Close any open service connection.
func (c *client) Close() {
	if c.icc != nil {
		c.icc.Close()
	}

	c.icc = nil
}

// CheckConnection if the connecton to CRI services is up, try to reconnect if requested.
func (c *client) CheckConnection(options ConnectOptions) error {
	if c.icc == nil || c.icc.GetState() == connectivity.Ready {
		return nil
	}

	c.Close()

	if options.Reconnect {
		if _, err := c.Connect(ConnectOptions{Wait: false}); err == nil {
			return nil
		}
	}

	return clientError("client connections are down")
}

// HasRuntimeService checks if the client is configured with runtime services.
func (c *client) HasRuntimeService() bool {
	return c.options.RuntimeSocket != "" && c.options.RuntimeSocket != DontConnect
}

// HasImageService checks if the client is configured with image services.
func (c *client) HasImageService() bool {
	return c.options.ImageSocket != "" && c.options.ImageSocket != DontConnect
}

// connect attempts to create a gRPC client connection to the given socket.
func (c *client) connect(kind, socket string, options ConnectOptions) (*grpc.ClientConn, error) {
	var cc *grpc.ClientConn
	var err error

	if socket == DontConnect {
		return nil, nil
	}

	dialOpts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
		grpc.FailOnNonTempDialError(true),
		grpc.WithContextDialer(func(ctx context.Context, socket string) (net.Conn, error) {
			var conn net.Conn
			if deadLine, ok := ctx.Deadline(); ok {
				conn, err = net.DialTimeout("unix", socket, time.Until(deadLine))
			} else {
				conn, err = net.Dial("unix", socket)
			}
			if err != nil {
				return conn, err
			}
			c.dialNotify(socket)
			return conn, err
		}),
	}

	if options.Wait {
		if err = netutil.WaitForServer(socket, -1, dialOpts, &cc); err != nil {
			return nil, clientError("failed to connect to %s: %v", kind, err)
		}
	} else {
		if cc, err = grpc.Dial(socket, dialOpts...); err != nil {
			return nil, clientError("failed to connect to %s: %v", kind, err)
		}
	}

	return cc, nil
}

func (c *client) dialNotify(socket string) {
	if c.options.DialNotify == nil {
		return
	}

	info, err := os.Stat(socket)
	if err != nil {
		c.options.DialNotify(socket, -1, -1, 0, err)
		return
	}

	st, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		err := clientError("failed to stat socket %q: %v", socket, err)
		c.options.DialNotify(socket, -1, -1, 0, err)
		return
	}

	uid, gid := int(st.Uid), int(st.Gid)
	mode := info.Mode() & os.ModePerm
	c.options.DialNotify(socket, uid, gid, mode, nil)
}

// Return a formatted client-specific error.
func clientError(format string, args ...interface{}) error {
	return fmt.Errorf("cri/client: "+format, args...)
}
