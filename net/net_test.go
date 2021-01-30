package net

import (
	"fmt"
	"testing"
)

func TestNewNetwork(t *testing.T) {
	netyaml := NewNetwork("calico", MetaData{
		Interface: "interface=en.*|eth.*",
		CIDR:      "10.1.1.1/24",
		IPIP:      true,
		MTU:       "1440",
	}).Manifests("")
	fmt.Println(netyaml)

	netyaml = NewNetwork("calico", MetaData{
		Interface: "can-reach=192.168.160.1",
		CIDR:      "10.1.1.1/24",
		IPIP:      true,
		MTU:       "1440",
	}).Manifests("")
	fmt.Println(netyaml)
}

func TestCniRepoNetwork(t *testing.T) {
	netyaml := NewNetwork("calico", MetaData{
		Interface: "can-reach=192.168.160.1",
		CIDR:      "10.1.1.1/24",
		IPIP:      true,
		MTU:       "1440",
		CniRepo:   "registry.cn-beijing.aliyuncs.com/k7scn",
	}).Manifests("")
	fmt.Println(netyaml)
	netyaml = NewNetwork("calico", MetaData{
		Interface: "can-reach=192.168.160.1",
		CIDR:      "10.1.1.1/24",
		IPIP:      true,
		MTU:       "1440",
		CniRepo:   "",
	}).Manifests("")
	fmt.Println(netyaml)
}
