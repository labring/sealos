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

package route

import (
	"errors"
	"fmt"
	"net"
	"os"
	"syscall"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/vishvananda/netlink"
)

var ErrNotIPV4Fmt = "IP %s is not valid IPV4 address"

type Route struct {
	Host    string
	Gateway string
}

func New(host, gateway string) *Route {
	return &Route{
		Host:    host,
		Gateway: gateway,
	}
}

func validateIPv4Type(addresses ...string) error {
	for i := range addresses {
		if !iputils.IsIpv4(addresses[i]) {
			return fmt.Errorf(ErrNotIPV4Fmt, addresses[i])
		}
	}
	return nil
}

func (r *Route) SetRoute() error {
	if err := validateIPv4Type(r.Gateway, r.Host); err != nil {
		return err
	}

	err := addRouteGatewayViaHost(r.Host, r.Gateway, 50)
	if err != nil && !errors.Is(err, os.ErrExist) /* return if route already exist */ {
		return fmt.Errorf("failed to add %s route gateway via host err: %v", r.Host, err)
	}
	logger.Info("success to set route.(host:%s, gateway:%s)", r.Host, r.Gateway)
	return nil
}

func (r *Route) DelRoute() error {
	if err := validateIPv4Type(r.Gateway, r.Host); err != nil {
		return err
	}

	err := delRouteGatewayViaHost(r.Host, r.Gateway)
	if err != nil && !errors.Is(err, syscall.ESRCH) /* return if route does not exist */ {
		return fmt.Errorf("failed to delete %s route gateway via host err: %v", r.Host, err)
	}
	logger.Info("success to del route.(host:%s, gateway:%s)", r.Host, r.Gateway)
	return nil
}

// addRouteGatewayViaHost host: 10.103.97.2  gateway 192.168.253.129
func addRouteGatewayViaHost(host, gateway string, priority int) error {
	Dst := &net.IPNet{
		IP:   net.ParseIP(host),
		Mask: net.CIDRMask(32, 32),
	}
	r := netlink.Route{
		Dst:      Dst,
		Gw:       net.ParseIP(gateway),
		Priority: priority,
	}
	return netlink.RouteAdd(&r)
}

// addRouteGatewayViaHost host: 10.103.97.2  gateway 192.168.253.129
func delRouteGatewayViaHost(host, gateway string) error {
	Dst := &net.IPNet{
		IP:   net.ParseIP(host),
		Mask: net.CIDRMask(32, 32),
	}
	r := netlink.Route{
		Dst: Dst,
		Gw:  net.ParseIP(gateway),
	}
	return netlink.RouteDel(&r)
}
