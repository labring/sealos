//go:build !linux
// +build !linux

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

package care

import (
	"context"
	"fmt"
	"net"
	"strconv"
	"time"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
)

// iptablesImpl provides a stub implementation for non-Linux platforms
type iptablesImpl struct {
	ifaceName string
}

// Ruler interface methods for non-Linux platforms
func newIptablesImpl(iface string, masqueradeBit int, virtualIPs ...string) (Ruler, error) {
	logger.Info("iptables functionality is not supported on non-Linux platforms")
	return &iptablesImpl{ifaceName: iface}, nil
}

func (impl *iptablesImpl) Setup() error {
	logger.Warn("iptables Setup() is a no-op on non-Linux platform: %s", impl.ifaceName)
	return nil
}

func (impl *iptablesImpl) Cleanup() error {
	logger.Warn("iptables Cleanup() is a no-op on non-Linux platform: %s", impl.ifaceName)
	return nil
}

// endpoint represents a service endpoint for non-Linux platforms
type endpoint struct {
	Host string
	Port uint16
}

func (ep *endpoint) String() string {
	return fmt.Sprintf("%s:%d", ep.Host, ep.Port)
}

// Proxier interface defines IPVS load balancer operations
type Proxier interface {
	EnsureVirtualServer(vs string) error
	DeleteVirtualServer(vs string) error
	EnsureRealServer(vs, rs string) error
	DeleteRealServer(vs, rs string) error
	RunLoop(context.Context) error
	TryRun() error
}

// Prober interface for health checking
type Prober interface {
	Probe(addr string, path string) error
}

// httpProber provides a stub implementation for non-Linux platforms
type httpProber struct{}

func (p *httpProber) Probe(addr string, path string) error {
	logger.Info("HTTP probe is a no-op on non-Linux platform: %s%s", addr, path)
	return nil
}

// Proxier interface stub implementation for non-Linux platforms
func NewProxier(scheduler string, interval time.Duration, prober Prober, periodicRun func() error) Proxier {
	logger.Info("IPVS proxier functionality is not supported on non-Linux platforms")
	return &stubProxier{prober: prober, periodicRun: periodicRun}
}

// splitHostPort splits a network address of the form "host:port" into host and port.
func splitHostPort(hostport string) (string, uint16, error) {
	host, portStr, err := net.SplitHostPort(hostport)
	if err != nil {
		return "", 0, err
	}
	port, err := strconv.ParseUint(portStr, 10, 16)
	if err != nil {
		return "", 0, err
	}
	return host, uint16(port), nil
}

// stubProxier provides a no-op implementation for non-Linux platforms
type stubProxier struct {
	prober      Prober
	periodicRun func() error
}

func (p *stubProxier) EnsureVirtualServer(vs string) error {
	logger.Warn("EnsureVirtualServer is a no-op on non-Linux platform: %s", vs)
	return nil
}

func (p *stubProxier) DeleteVirtualServer(vs string) error {
	logger.Warn("DeleteVirtualServer is a no-op on non-Linux platform: %s", vs)
	return nil
}

func (p *stubProxier) EnsureRealServer(vs, rs string) error {
	logger.Warn("EnsureRealServer is a no-op on non-Linux platform: vs=%s, rs=%s", vs, rs)
	return nil
}

func (p *stubProxier) DeleteRealServer(vs, rs string) error {
	logger.Warn("DeleteRealServer is a no-op on non-Linux platform: vs=%s, rs=%s", vs, rs)
	return nil
}

func (p *stubProxier) RunLoop(ctx context.Context) error {
	logger.Info("RunLoop is a no-op on non-Linux platform")
	<-ctx.Done()
	return ctx.Err()
}

func (p *stubProxier) TryRun() error {
	logger.Info("TryRun is a no-op on non-Linux platform")
	if p.periodicRun != nil {
		return p.periodicRun()
	}
	return nil
}

func (p *stubProxier) Stop() {
	logger.Info("Stop is a no-op on non-Linux platform")
}

// stubOptions provides a stub implementation for non-Linux platforms
type stubOptions struct {
	Logger string
}

func (o *stubOptions) ValidateAndSetDefaults() error {
	logger.Info("ValidateAndSetDefaults is a no-op on non-Linux platform")
	return nil
}

// LVS provides a stub implementation for non-Linux platforms
var LVS = &stubRunner{}

type stubRunner struct {
	stubOptions
}

func (r *stubRunner) Run() error {
	logger.Info("LVS Run is a no-op on non-Linux platform")
	return nil
}

func (r *stubRunner) RegisterCommandFlags(cmd *cobra.Command) {
	logger.Info("RegisterCommandFlags is a no-op on non-Linux platform")
}