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
	"fmt"
	"net"
	"net/url"
	"strings"
)

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

func CheckDomain(domain string) bool {
	_, errURL := url.Parse(domain)
	return errURL == nil
}
