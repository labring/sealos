package infra

import (
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
)

func GetPublicIp(hosts []v1.Hosts) []string {
	return getIPSByType(hosts, common.IPTypePublic)
}

func GetPrivateIp(hosts []v1.Hosts) []string {
	return getIPSByType(hosts, common.IPTypePrivate)
}

func getIPSByType(hosts []v1.Hosts, ipType string) (ips []string) {
	masterIps := make(map[string]struct{})
	var master0Ip string
	for _, h := range hosts {
		for _, m := range h.Metadata {
			for _, ip := range m.IP {
				if ip.IPType != ipType {
					continue
				}
				masterIps[ip.IPValue] = struct{}{}
				if _, ok := m.Labels[common.MasterO]; ok {
					master0Ip = ip.IPValue
				}
				break
			}
		}
	}
	if master0Ip != "" {
		ips = append(ips, master0Ip)
	}

	for ip := range masterIps {
		if ip != master0Ip {
			ips = append(ips, ip)
		}
	}
	return
}
