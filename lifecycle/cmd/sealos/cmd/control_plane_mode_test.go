// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package cmd

import (
	"errors"
	"io"
	"strings"
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

func TestSwitchModeConfirmation(t *testing.T) {
	promptErr := errors.New("confirmation interrupted")
	for _, mode := range []string{"standalone", "registered"} {
		for _, test := range []struct {
			name       string
			flags      []string
			accepted   bool
			promptErr  error
			wantPrompt bool
			wantRun    bool
		}{
			{
				name:       "confirmed",
				accepted:   true,
				wantPrompt: true,
				wantRun:    true,
			},
			{
				name:       "cancelled",
				wantPrompt: true,
			},
			{
				name:       "interrupted",
				promptErr:  promptErr,
				wantPrompt: true,
			},
			{
				name:    "yes",
				flags:   []string{"--yes"},
				wantRun: true,
			},
			{
				name:    "short yes",
				flags:   []string{"-y"},
				wantRun: true,
			},
			{
				name:       "explicit no bypass",
				flags:      []string{"--yes=false"},
				wantPrompt: true,
			},
			{
				name:    "check only",
				flags:   []string{"--check-only"},
				wantRun: true,
			},
		} {
			t.Run(mode+"/"+test.name, func(t *testing.T) {
				prompted := false
				ran := false
				cmd := newControlPlaneModeCmdWithConfirm(func(prompt, _ string) (bool, error) {
					prompted = true
					if !strings.Contains(prompt, `cluster "test-cluster"`) || !strings.Contains(prompt, mode+" mode") {
						t.Fatalf("confirmation does not identify the target: %s", prompt)
					}
					return test.accepted, test.promptErr
				})
				for _, child := range cmd.Commands() {
					child.RunE = func(_ *cobra.Command, _ []string) error {
						ran = true
						return nil
					}
				}
				cmd.SetOut(io.Discard)
				cmd.SetErr(io.Discard)
				cmd.SetArgs(append([]string{mode, "--cluster", "test-cluster"}, test.flags...))
				err := cmd.Execute()
				if (err == nil) != test.wantRun || prompted != test.wantPrompt || ran != test.wantRun {
					t.Fatalf("unexpected confirmation result: prompted=%t, ran=%t, err=%v", prompted, ran, err)
				}
				if test.promptErr != nil && !errors.Is(err, test.promptErr) {
					t.Fatalf("lost confirmation error: %v", err)
				}
			})
		}
	}
}
