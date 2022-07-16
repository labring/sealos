/*
Copyright 2021 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package iputils

import (
	"net"
	"net/url"
)

//IPFormat is
func IPFormat(ipStr string) string {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		host, _, err := net.SplitHostPort(ipStr)
		if err != nil {
			//logger.Error("invalied host fomat [%s], must like 172.0.0.2:22.error: %s", ipStr, err)
			return ""
		}
		ip = net.ParseIP(host)
	}
	if ip == nil {
		//logger.Error("invalied host fomat [%s], must like 172.0.0.2:22", ipStr)
		return ""
	}
	return ip.String()
}

func HostnameAndIP(node []string) ([]string, []string) {
	var resHost, resIP []string
	if len(node) == 0 {
		return node, node
	}
	for _, n := range node {
		if !IsIpv4String(n) {
			resHost = append(resHost, n)
		} else {
			resIP = append(resIP, n)
		}
	}
	return resHost, resIP
}

// IsIpv4String returns if ip is IPv4.
func IsIpv4String(ip string) bool {
	netIP := net.ParseIP(ip)
	return IsIpv4(netIP)
}

// IsIPv4 returns if ip is IPv4.
func IsIpv4(netIP net.IP) bool {
	return netIP != nil && netIP.To4() != nil
}

// IsIPv6 returns if netIP is IPv6.
func IsIPv6(netIP net.IP) bool {
	return netIP != nil && netIP.To4() == nil
}

func CheckDomain(domain string) bool {
	_, errURL := url.Parse(domain)
	return errURL == nil
}
