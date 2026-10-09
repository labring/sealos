// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
		parent := newSwitchCmd()
		if parent.Name() != "switch" || len(parent.Commands()) != 1 {
			t.Fatalf("unexpected parent command: %s", parent.Name())
		}
		parent = parent.Commands()[0]
		if parent.Name() != "control-plane" {
			t.Fatalf("unexpected switch group: %s", parent.Name())
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
				group := newControlPlaneModeCmdWithConfirm(func(prompt, _ string) (bool, error) {
					prompted = true
					if !strings.Contains(prompt, `cluster "test-cluster"`) ||
						!strings.Contains(prompt, mode+" mode") {
						t.Fatalf("confirmation does not identify the target: %s", prompt)
					}
					return test.accepted, test.promptErr
				})
				for _, child := range group.Commands() {
					child.RunE = func(_ *cobra.Command, _ []string) error {
						ran = true
						return nil
					}
				}
				cmd := newSwitchCmd()
				cmd.RemoveCommand(cmd.Commands()[0])
				cmd.AddCommand(group)
				cmd.SetOut(io.Discard)
				cmd.SetErr(io.Discard)
				args := make([]string, 0, 4+len(test.flags))
				args = append(args, "control-plane", mode, "--cluster", "test-cluster")
				args = append(args, test.flags...)
				cmd.SetArgs(args)
				err := cmd.Execute()
				if (err == nil) != test.wantRun || prompted != test.wantPrompt ||
					ran != test.wantRun {
					t.Fatalf(
						"unexpected confirmation result: prompted=%t, ran=%t, err=%v",
						prompted,
						ran,
						err,
					)
				}
				if test.promptErr != nil && !errors.Is(err, test.promptErr) {
					t.Fatalf("lost confirmation error: %v", err)
				}
			})
		}
	}
}

func TestSwitchClusterFlagPositions(t *testing.T) {
	for _, args := range [][]string{
		{"-c", "test-cluster", "control-plane", "standalone"},
		{"control-plane", "-c", "test-cluster", "standalone"},
		{"control-plane", "standalone", "-c", "test-cluster"},
	} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			cmd := newSwitchCmd()
			mode, _, err := cmd.Find([]string{"control-plane", "standalone"})
			if err != nil {
				t.Fatal(err)
			}
			ran := false
			mode.RunE = func(cmd *cobra.Command, _ []string) error {
				ran = true
				cluster, err := cmd.Flags().GetString("cluster")
				if err != nil || cluster != "test-cluster" {
					t.Fatalf("unexpected cluster: %q, err=%v", cluster, err)
				}
				return nil
			}
			cmd.SetArgs(append(args, "--check-only"))
			if err := cmd.Execute(); err != nil {
				t.Fatal(err)
			}
			if !ran {
				t.Fatal("mode command was not executed")
			}
		})
	}
}
