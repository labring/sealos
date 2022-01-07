// Copyright © 2021 Alibaba Group Holding Ltd.
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

package utils

import (
	"fmt"
	"math/big"
	"net"
	"strings"
)

//use only one
func GetHostIP(host string) string {
	if !strings.ContainsRune(host, ':') {
		return host
	}
	return strings.Split(host, ":")[0]
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

func GetHostIPSlice(hosts []string) (res []string) {
	for _, ip := range hosts {
		res = append(res, GetHostIP(ip))
	}
	return
}

func IsLocalHostAddrs() (*[]net.Addr, error) {
	netInterfaces, err := net.Interfaces()
	if err != nil {
		fmt.Println("net.Interfaces failed, err:", err.Error())
		return nil, err
	}
	var allAddrs []net.Addr
	for i := 0; i < len(netInterfaces); i++ {
		if (netInterfaces[i].Flags & net.FlagUp) == 0 {
			continue
		}
		addrs, err := netInterfaces[i].Addrs()
		if err != nil {
			fmt.Printf("failed to get Addrs, %s", err.Error())
		}
		for j := 0; j < len(addrs); j++ {
			allAddrs = append(allAddrs, addrs[j])
		}
	}
	return &allAddrs, nil
}

func IsLocalIP(ip string, addrs *[]net.Addr) bool {
	for _, address := range *addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil && ipnet.IP.String() == ip {
			return true
		}
	}
	return false
}

func AssemblyIPList(args *string) error {
	var result string
	var ips = strings.Split(*args, "-")
	if *args == "" || !strings.Contains(*args, "-") {
		return nil
	}
	if len(ips) != 2 {
		return fmt.Errorf("ip is invalid，ip range format is xxx.xxx.xxx.1-xxx.xxx.xxx.2")
	}
	if !CheckIP(ips[0]) || !CheckIP(ips[1]) {
		return fmt.Errorf("ip is invalid，check you command agrs")
	}
	for res, _ := CompareIP(ips[0], ips[1]); res <= 0; {
		result = ips[0] + "," + result
		ips[0] = NextIP(ips[0]).String()
		res, _ = CompareIP(ips[0], ips[1])
	}
	if result == "" {
		return fmt.Errorf("ip is invalid，check you command agrs")
	}
	*args = result
	return nil
}

func CheckIP(i string) bool {
	if !strings.Contains(i, ":") {
		return net.ParseIP(i) != nil
	}
	if _, err := net.ResolveTCPAddr("tcp", i); err != nil {
		return false
	}
	return true
}

func DisassembleIPList(arg string) (res []string) {
	ipList := strings.Split(arg, ",")
	for _, i := range ipList {
		if strings.Contains(i, "-") {
			if err := AssemblyIPList(&i); err != nil {
				fmt.Printf("failed to get Addrs, %s", err.Error())
				continue
			}
			res = append(res, strings.Split(i, ",")...)
		}
		res = append(res, i)
	}
	return
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
		return 2, fmt.Errorf("ip is invalid，check you command agrs")
	}
	return i.Cmp(j), nil
}

func NextIP(ip string) net.IP {
	i := IPToInt(ip)
	return i.Add(i, big.NewInt(1)).Bytes()
}
