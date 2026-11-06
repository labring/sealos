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
package net

import (
	"fmt"
	"net"
	"os"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"k8s.io/apimachinery/pkg/util/sets"
)

// WaitForServer waits for a gRPC server to start accepting connections on a socket.
func WaitForServer(socket string, timeout time.Duration, opts ...interface{}) error {
	var errChecker []func(error) bool
	var dialOpts []grpc.DialOption
	var connp **grpc.ClientConn

	for _, o := range opts {
		switch o := o.(type) {
		case func(error) bool:
			errChecker = append(errChecker, o)
		case grpc.DialOption:
			dialOpts = append(dialOpts, o)
		case []grpc.DialOption:
			dialOpts = append(dialOpts, o...)
		case **grpc.ClientConn:
			if connp != nil {
				return fmt.Errorf("waitForServer: multiple net.Conn pointer options given")
			}
			connp = o
		default:
			return fmt.Errorf("waitForServer: invalid option of type %T", o)
		}
	}

	if len(errChecker) < 1 {
		errChecker = []func(error) bool{isFatalDialError}
	}

	if len(dialOpts) == 0 {
		dialOpts = []grpc.DialOption{
			grpc.WithInsecure(),
			grpc.WithBlock(),
			grpc.FailOnNonTempDialError(true),
			grpc.WithTimeout(timeout),
			grpc.WithDialer(func(socket string, timeout time.Duration) (net.Conn, error) {
				conn, err := net.Dial("unix", socket)
				return conn, err
			}),
		}
	}

	start := time.Now()
	for {
		conn, err := grpc.Dial(socket, dialOpts...)
		if err == nil {
			if connp != nil {
				*connp = conn
			} else {
				conn.Close()
			}
			return nil
		}

		for _, f := range errChecker {
			if f(err) {
				return err
			}
		}

		switch {
		case timeout >= 0 && start.Add(timeout).Before(time.Now()):
			return err
		case timeout < 0 || timeout > time.Second:
			time.Sleep(time.Second)
		default:
			time.Sleep(timeout / 2)
		}
	}
}

// ServerActiveAt checks if a gRPC server is accepting connections at the socket.
func ServerActiveAt(socket string) bool {
	return WaitForServer(socket, time.Second) == nil
}

// Check if a socket connection error looks fatal.
//
// Notes:
//   Hmm... I wonder if it is really so difficult or I am just doing
//   it wrong ? We would like to find out if a connection attempt to
//   a unix-domain socket fails with a fatal error, in which case we
//   don't want to stick around retrying it later.
//
//   We treat errors which the originating layer considers a timeout
//   or a temporary error as non-fatal one. Otherwise, we single out
//   a few special errors:
//     - EPERM: fatal error
//     - EACCES: fatal error
//     - ENOENT: non-fatal, server might still come around
//     - ECONNREFUSED: non-fatal, maybe a lingering socket
//

type temporary interface {
	Temporary() bool
}

type timeout interface {
	Timeout() bool
}

type origin interface {
	Origin() error
}

func isFatalDialError(err error) bool {
	for {
		if e, ok := err.(temporary); ok {
			if e.Temporary() {
				return false
			}
		}
		if e, ok := err.(timeout); ok {
			if e.Timeout() {
				return false
			}
		}

		switch err.(type) { //nolint:gosimple
		case *net.OpError:
			err = err.(*net.OpError).Err //nolint:gosimple
			continue
		case *os.SyscallError:
			ne := err.(*os.SyscallError) //nolint:gosimple
			switch {
			case os.IsPermission(ne):
				return true
			case os.IsNotExist(ne):
				return false
			case ne.Err == syscall.ECONNREFUSED:
				return true
			default:
				err = ne
				continue
			}
		default:
			if oe, ok := err.(origin); ok {
				err = oe.Origin()
				continue
			}
		}

		return true
	}
}

func IsIPv6(netIP net.IP) bool {
	return netIP != nil && netIP.To4() == nil
}

func IsValidForSet(isIPv6 bool, ip net.IP) bool {
	if isIPv6 != IsIPv6(ip) {
		return false
	}
	if isIPv6 && ip.IsLinkLocalUnicast() {
		return false
	}
	if ip.IsLoopback() {
		return false
	}
	return true
}

func AddressSet(isValid func(ip net.IP) bool, addrs []net.Addr) sets.String {
	ips := sets.NewString()
	for _, a := range addrs {
		var ip net.IP
		switch v := a.(type) {
		case *net.IPAddr:
			ip = v.IP
		case *net.IPNet:
			ip = v.IP
		default:
			continue
		}
		if isValid(ip) {
			ips.Insert(ip.String())
		}
	}
	return ips
}
