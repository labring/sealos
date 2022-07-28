/*
Copyright 2022 cuisongliu@qq.com.

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

package utils

import (
	"net"

	"k8s.io/apimachinery/pkg/util/sets"
)

// IsIpv4 returns if netIP is IPv4.
func IsIpv4(ip string) bool {
	netIP := net.ParseIP(ip)
	return netIP != nil && netIP.To4() != nil
}

// IsIPv6 returns if netIP is IPv6.
func IsIPv6(netIP net.IP) bool {
	return netIP != nil && netIP.To4() == nil
}

// AddressSet validates the addresses in the slice using the "isValid" function.
// Addresses that pass the validation are returned as a string Set.
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
