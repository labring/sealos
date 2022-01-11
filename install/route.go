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

package install

import (
	"fmt"
	"net"

	"github.com/vishvananda/netlink"
	k8snet "k8s.io/apimachinery/pkg/util/net"

	"github.com/fanux/sealos/k8s"
)

type RouteFlags struct {
	Host    string
	Gateway string
}

func GetRouteFlag(host, gateway string) *RouteFlags {
	return &RouteFlags{
		Host:    host,
		Gateway: gateway,
	}
}

func (r *RouteFlags) useHostCheckRoute() bool {
	return k8s.IsIpv4(r.Host) && r.Gateway == ""
}

func (r *RouteFlags) useGatewayManageRoute() bool {
	return k8s.IsIpv4(r.Gateway) && k8s.IsIpv4(r.Host)
}

func (r *RouteFlags) CheckRoute() {
	if r.useHostCheckRoute() {
		if isDefaultRouteIP(r.Host) {
			fmt.Println("ok")
			return
		}
		fmt.Println("failed")
	}
}

func (r *RouteFlags) SetRoute() {
	if r.useGatewayManageRoute() {
		err := addRouteGatewayViaHost(r.Host, r.Gateway, 50)
		if err != nil {
			fmt.Println("addRouteGatewayViaHost err: ", err)
		}
	}
}

func (r *RouteFlags) DelRoute() {
	if r.useGatewayManageRoute() {
		err := delRouteGatewayViaHost(r.Host, r.Gateway)
		if err != nil {
			fmt.Println("delRouteGatewayViaHost err: ", err)
		}
	}
}

// getDefaultRouteIp is get host ip by ChooseHostInterface() .
func getDefaultRouteIP() (ip string, err error) {
	netIP, err := k8snet.ChooseHostInterface()
	if err != nil {
		return "", err
	}
	return netIP.String(), nil
}

// isDefaultRouteIp return true if host equal default route ip host.
func isDefaultRouteIP(host string) bool {
	ip, _ := getDefaultRouteIP()
	return ip == host
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
