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

package iputils

import (
	"errors"
	"fmt"
	"math/big"
	"net"
	"strings"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/utils/logger"
)

// use only one
func GetHostIP(host string) string {
	if !strings.ContainsRune(host, ':') {
		return host
	}
	return strings.Split(host, ":")[0]
}

func GetDiffHosts(hostsOld, hostsNew []string) (add, sub []string) {
	// Difference returns a set of objects that are not in s2
	// For example:
	// s1 = {a1, a2, a3}
	// s2 = {a1, a2, a4, a5}
	// s1.Difference(s2) = {a3}
	// s2.Difference(s1) = {a4, a5}
	oldSet := sets.NewString(GetHostIPs(hostsOld)...)
	newSet := sets.NewString(GetHostIPs(hostsNew)...)
	addIPs := newSet.Difference(oldSet).List()
	subIPs := oldSet.Difference(newSet).List()

	for _, ip := range hostsNew {
		for _, aIP := range addIPs {
			if aIP == GetHostIP(ip) {
				add = append(add, ip)
			}
		}
	}
	for _, ip := range hostsOld {
		for _, aIP := range subIPs {
			if aIP == GetHostIP(ip) {
				sub = append(sub, ip)
			}
		}
	}
	return
}

func GetHostIPs(hosts []string) []string {
	var ips []string
	for _, name := range hosts {
		ips = append(ips, GetHostIP(name))
	}
	return ips
}

func GetHostIPAndPortOrDefault(host, Default string) (string, string) {
	if !strings.ContainsRune(host, ':') {
		return host, Default
	}
	split := strings.Split(host, ":")
	return split[0], split[1]
}

func GetSSHHostIPAndPort(host string) (string, string) {
	return GetHostIPAndPortOrDefault(host, "22")
}

func GetHostIPAndPortSlice(hosts []string, Default string) (res []string) {
	for _, ip := range hosts {
		_ip, port := GetHostIPAndPortOrDefault(ip, Default)
		res = append(res, fmt.Sprintf("%s:%s", _ip, port))
	}
	return
}

func GetHostIPSlice(hosts []string) (res []string) {
	for _, ip := range hosts {
		res = append(res, GetHostIP(ip))
	}
	return
}

func ListLocalHostAddrs() (*[]net.Addr, error) {
	netInterfaces, err := net.Interfaces()
	if err != nil {
		logger.Warn("net.Interfaces failed, err:", err.Error())
		return nil, err
	}
	var allAddrs []net.Addr
	for i := 0; i < len(netInterfaces); i++ {
		if (netInterfaces[i].Flags & net.FlagUp) == 0 {
			continue
		}
		addrs, err := netInterfaces[i].Addrs()
		if err != nil {
			logger.Warn("failed to get Addrs, %s", err.Error())
		}
		for j := 0; j < len(addrs); j++ {
			allAddrs = append(allAddrs, addrs[j])
		}
	}
	return &allAddrs, nil
}

func IsLocalIP(ip string, addrs *[]net.Addr) bool {
	if defaultIP, _, err := net.SplitHostPort(ip); err == nil {
		ip = defaultIP
	}
	for _, address := range *addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil && ipnet.IP.String() == ip {
			return true
		}
	}
	return false
}

func LocalIP(addrs *[]net.Addr) string {
	for _, address := range *addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
			return ipnet.IP.String()
		}
	}
	return ""
}

func inc(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

func ParseIPList(s string) ([]string, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	var ret []string
	if strings.Contains(s, ",") {
		ss := strings.Split(s, ",")
		for i := range ss {
			ret2, err := ParseIPList(ss[i])
			if err != nil {
				return nil, err
			}
			ret = append(ret, ret2...)
		}
	} else if strings.Contains(s, "/") {
		ip, ipnet, err := net.ParseCIDR(s)
		if err != nil {
			return nil, err
		}
		for ip := ip.Mask(ipnet.Mask); ipnet.Contains(ip); inc(ip) {
			ret = append(ret, ip.String())
		}
		// network address and broadcast address are included
	} else if strings.Contains(s, "-") {
		ips := strings.Split(s, "-")
		if len(ips) != 2 {
			return nil, errors.New("ip range format is invalid")
		}
		for i := range ips {
			if !CheckIP(ips[i]) {
				return nil, fmt.Errorf("invalid ip: %v", ips[i])
			}
		}
		first := true
		for {
			res, _ := CompareIP(ips[0], ips[1])
			if res > 0 {
				if first {
					return nil, fmt.Errorf("start ip %s cannot greater than end ip %s", ips[0], ips[1])
				}
				break
			}
			ret = append(ret, ips[0])
			ips[0] = NextIP(ips[0]).String()
			first = false
		}
	} else {
		ip := net.ParseIP(GetHostIP(s))
		if ip == nil {
			return nil, fmt.Errorf("invalid ip: %v", s)
		}
		ret = append(ret, s)
	}
	return ret, nil
}

func CheckIP(i string) bool {
	if !strings.Contains(i, ":") {
		return net.ParseIP(i) != nil
	}
	return false
}

func IPToInt(v string) *big.Int {
	ip := net.ParseIP(v).To4()
	if val := ip.To4(); val != nil {
		return big.NewInt(0).SetBytes(val)
	}
	return big.NewInt(0).SetBytes(ip.To16())
}

func CompareIP(v1, v2 string) (int, error) {
	i := IPToInt(v1)
	j := IPToInt(v2)

	if i == nil || j == nil {
		return 2, fmt.Errorf("ip is invalid，check you command args")
	}
	return i.Cmp(j), nil
}

func NextIP(ip string) net.IP {
	i := IPToInt(ip)
	return i.Add(i, big.NewInt(1)).Bytes()
}

func Contains(sub, s string) (bool, error) {
	_, ipNet, err := net.ParseCIDR(sub)
	if err != nil {
		return false, err
	}
	ip := net.ParseIP(s)
	if ip == nil {
		return false, fmt.Errorf("%s is not a valid IP address", s)
	}
	return ipNet.Contains(ip), nil
}
