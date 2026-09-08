// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package cmd

import (
	"testing"

	"github.com/spf13/cobra"
)

func TestSwitchModeFlagIsolation(t *testing.T) {
	find := func(mode string) *cobra.Command {
		t.Helper()
		parent := newControlPlaneModeCmd()
		if parent.Name() != "switch" {
			t.Fatalf("unexpected parent command: %s", parent.Name())
		}
		for _, child := range parent.Commands() {
			if child.Name() == mode {
				return child
			}
		}
		t.Fatalf("missing %s subcommand", mode)
		return nil
	}
	standalone := find("standalone")
	if err := standalone.ParseFlags([]string{
		"--route-controller-image=example.com/controller:v1",
		"--route-controller-kubeconfig=/etc/controller.conf",
		"--route-controller-config=/etc/controller.yaml",
		"--route-table=200",
		"--route-protocol=111",
		"--check-only",
		"--timeout=2m",
	}); err != nil {
		t.Fatal(err)
	}
	if err := find("registered").ParseFlags([]string{"--check-only", "--timeout=2m"}); err != nil {
		t.Fatal(err)
	}
	for _, argument := range []string{
		"--route-controller-image=example.com/controller:v1",
		"--route-controller-kubeconfig=/etc/controller.conf",
		"--route-controller-config=/etc/controller.yaml",
		"--route-table=200",
		"--route-protocol=111",
	} {
		if err := find("registered").ParseFlags([]string{argument}); err == nil {
			t.Fatalf("registered accepted standalone option %s", argument)
		}
	}
	for _, mode := range []string{"standalone", "registered"} {
		for _, argument := range []string{"--mode=standalone", "--route-controller-manifest=/etc/pod.yaml"} {
			if err := find(mode).ParseFlags([]string{argument}); err == nil {
				t.Fatalf("%s accepted obsolete option %s", mode, argument)
			}
		}
	}
}
