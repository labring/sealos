package net

import (
	"fmt"
	"testing"
)

func TestNewNetwork(t *testing.T) {
	netyaml := NewNetwork("calico", MetaData{
		Interface: "en.*|eth.*",
		CIDR:      "10.1.1.1/24",
		IPIP:      true,
		MTU:       "1440",
	}).Manifests("")
	fmt.Println(netyaml)
}
