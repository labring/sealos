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

package utils

import (
	"fmt"
	"math/big"
	"net"
	"net/url"
	"strings"

	"github.com/fanux/sealos/pkg/utils/logger"
)

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

// ParseIPs 解析ip 192.168.0.2-192.168.0.6
func ParseIPs(ipList []string) (res []string) {
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
func CheckIP(ipStr string) bool {
	host, _, err := net.SplitHostPort(ipStr)
	if err != nil {
		return false
	}
	ip := net.ParseIP(host)
	if _, err = net.ResolveTCPAddr("tcp", ipStr); err != nil {
		return false
	}
	return ip != nil
}

//IPFormat is
func IPFormat(ipStr string) string {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		host, _, err := net.SplitHostPort(ipStr)
		if err != nil {
			logger.Error("invalied host fomat [%s], must like 172.0.0.2:22.error: %s", ipStr, err)
			return ""
		}
		ip = net.ParseIP(host)
	}
	if ip == nil {
		logger.Error("invalied host fomat [%s], must like 172.0.0.2:22", ipStr)
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
		if !IsIpv4(n) {
			resHost = append(resHost, n)
		} else {
			resIP = append(resIP, n)
		}
	}
	return resHost, resIP
}

func IsIpv4(ip string) bool {
	//matched, _ := regexp.MatchString("((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}", ip)

	arr := strings.Split(ip, ".")
	if len(arr) != 4 {
		return false
	}
	for _, v := range arr {
		if v == "" {
			return false
		}
		if len(v) > 1 && v[0] == '0' {
			return false
		}
		num := 0
		for _, c := range v {
			if c >= '0' && c <= '9' {
				num = num*10 + int(c-'0')
			} else {
				return false
			}
		}
		if num > 255 {
			return false
		}
	}
	return true
}

// RemoveDeduplicate is Deduplication []string
func RemoveDeduplicate(a []string) []string {
	if len(a) == 0 {
		return a
	}
	res := make([]string, 0, len(a))
	tmp := map[string]struct{}{}
	for _, v := range a {
		if _, ok := tmp[v]; !ok {
			tmp[v] = struct{}{}
			res = append(res, v)
		}
	}
	return res
}

func CheckDomain(domain string) bool {
	_, errURL := url.Parse(domain)
	return errURL == nil
}
