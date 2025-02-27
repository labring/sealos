package network

import (
	"fmt"
	"net"
)

func isValidSubnet(subnet string) error {
	_, _, err := net.ParseCIDR(subnet)
	if err != nil {
		return fmt.Errorf("failed to parse subnet: %w", err)
	}
	return nil
}

func isIPInSubnet(ip string, subnet string) (bool, error) {
	_, ipNet, err := net.ParseCIDR(subnet)
	if err != nil {
		return false, fmt.Errorf("failed to parse subnet: %w", err)
	}
	return ipNet.Contains(net.ParseIP(ip)), nil
}

func IsValidSubnets(subnets []string) error {
	for _, subnet := range subnets {
		if err := isValidSubnet(subnet); err != nil {
			return err
		}
	}
	return nil
}

func IsIPInSubnets(ip string, subnets []string) (bool, error) {
	for _, subnet := range subnets {
		if ok, err := isIPInSubnet(ip, subnet); err != nil {
			return false, err
		} else if ok {
			return true, nil
		}
	}
	return false, nil
}
