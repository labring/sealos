package install

import (
	"fmt"
	"github.com/fanux/sealos/k8s"
	"github.com/fanux/sealos/pkg/sshcmd/cmd"
	"github.com/wonderivan/logger"
	k8snet "k8s.io/apimachinery/pkg/util/net"
	"strings"
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

func (r *RouteFlags) useHostSetRoute() bool {
	return k8s.IsIpv4(r.Host)
}

func (r *RouteFlags) useGatewaySetRoute() bool {
	return k8s.IsIpv4(r.Gateway)
}

func (r *RouteFlags) SetRoute() {
	if r.useGatewaySetRoute() {
		if isDefaultGateway(r.Gateway) {
			logger.Alert("%s is default route gateway, return", r.Gateway)
			return
		}
		setDefaultGateway(r.Gateway)
		logger.Alert("set default route gateway %s", r.Gateway)
		return
	}

	if r.useHostSetRoute() {
		if isDefaultRoute(r.Host) {
			logger.Alert("%s is default route host, return", r.Host)
			return
		} else {
			changeDefaultByHost(r.Host)
			logger.Alert("set default route gateway by host %s", r.Host)
		}
	}
}

// isDefaultGateway return true when ip is equal default route gateway
func isDefaultGateway(ip string) bool {
	host, err := getDefaultRouteIp()
	if err != nil {
		return false
	}
	return ip == gateway(host)
}

// setDefaultGateway by gateway
func setDefaultGateway(ip string) {
	route := fmt.Sprintf("ip route del default && ip route add default via %s", ip)
	fmt.Println(route)
	cmd.Cmd("/bin/sh", "-c", route)
}

// getDefaultRouteIp is get host ip by ChooseHostInterface() .
func getDefaultRouteIp() (ip string, err error) {
	netIp, err := k8snet.ChooseHostInterface()
	if err != nil {
		return "", err
	}
	return netIp.String(), nil
}

// isDefaultRoute return true if host equal default route ip host.
func isDefaultRoute(host string) bool {
	ip, _ := getDefaultRouteIp()
	fmt.Printf("%s is default route ip\n", ip)
	return ip == host
}

// changeDefaultByHost is set default route by host ip
func changeDefaultByHost(host string) {
	ip := gateway(host)
	route := fmt.Sprintf("ip route del default && ip route add default via %s", ip)
	fmt.Println(route)
	cmd.Cmd("/bin/sh", "-c", route)
}

// gateway return ipv4 gateway by Split ipv4.
func gateway(host string) string {
	a := strings.Split(host, ".")
	return fmt.Sprintf("%s.%s.%s.1", a[0], a[1], a[2])
}
