package utils

import (
	"fmt"
	"net"
)

func IsIPInCIDR(ip net.IP, cidr string) bool {
	_, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		fmt.Println("Error parsing CIDR:", err)
		return false
	}
	return ipNet.Contains(ip)
}
