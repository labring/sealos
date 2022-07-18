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
	"strings"

	"github.com/vishvananda/netlink"
)

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

// IsIPv6 returns if netIP is IPv6.
func IsIPv6(netIP net.IP) bool {
	return netIP != nil && netIP.To4() == nil
}

func GetOrCreateDummyLink(name string) (netlink.Link, error) {
	link, _ := netlink.LinkByName(name)
	if link != nil {
		return link, nil
	}
	link = &netlink.Dummy{
		LinkAttrs: netlink.LinkAttrs{
			Name: name,
		},
	}
	return link, netlink.LinkAdd(link)
}

func AssignIPToLink(s string, link netlink.Link) error {
	if !strings.Contains(s, "/") {
		s = s + "/32"
	}
	addr, err := netlink.ParseAddr(s)
	if err != nil {
		return err
	}
	return netlink.AddrAdd(link, addr)
}

func DeleteLinkByName(name string) error {
	l, err := netlink.LinkByName(name)
	if err != nil {
		if err, ok := err.(netlink.LinkNotFoundError); !ok {
			return err
		}
		return nil
	}
	return netlink.LinkDel(l)
}
