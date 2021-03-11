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

	netyaml = NewNetwork("cilium", MetaData{
		CIDR:           "10.1.1.1/24",
		K8sServiceHost: "127.0.0.1",
		// K8sServicePort: "6443",
	}).Manifests("")
	fmt.Println(netyaml)
}
