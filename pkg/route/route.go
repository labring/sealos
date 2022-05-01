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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/vishvananda/netlink"
	k8snet "k8s.io/apimachinery/pkg/util/net"
)

var ErrNotIPV4 = errors.New("IP addresses are not IPV4 rules")

type Route struct {
	Host    string
	Gateway string
}

func NewRoute(host, gateway string) *Route {
	return &Route{
		Host:    host,
		Gateway: gateway,
	}
}

func CheckIsDefaultRoute(host string) error {
	ok, err := isDefaultRouteIP(host)
	if err == nil && ok {
		_, err = os.Stdout.WriteString("ok")
	}
	if err == nil && !ok {
		_, err = os.Stderr.WriteString("failed")
	}
	return err
}

func (r *Route) SetRoute() error {
	if !iputils.IsIpv4(r.Gateway) || !iputils.IsIpv4(r.Host) {
		return ErrNotIPV4
	}
	err := addRouteGatewayViaHost(r.Host, r.Gateway, 50)
	if err != nil && !errors.Is(err, os.ErrExist) /* return if route already exist */ {
		return fmt.Errorf("failed to add %s route gateway via host err: %v", r.Host, err)
	}
	logger.Info(fmt.Sprintf("success to set route.(host:%s, gateway:%s)", r.Host, r.Gateway))
	return nil
}

func (r *Route) DelRoute() error {
	if !iputils.IsIpv4(r.Gateway) || !iputils.IsIpv4(r.Host) {
		return ErrNotIPV4
	}

	err := delRouteGatewayViaHost(r.Host, r.Gateway)
	if err != nil && !errors.Is(err, syscall.ESRCH) /* return if route does not exist */ {
		return fmt.Errorf("failed to delete %s route gateway via host err: %v", r.Host, err)
	}
	logger.Info(fmt.Sprintf("success to del route.(host:%s, gateway:%s)", r.Host, r.Gateway))
	return nil
}

// isDefaultRouteIP return true if host equal default route ip host.
func isDefaultRouteIP(host string) (bool, error) {
	netIP, err := k8snet.ChooseHostInterface()
	if err != nil {
		return false, fmt.Errorf("failed to get default route ip, err: %v", err)
	}
	return netIP.String() == host, nil
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
