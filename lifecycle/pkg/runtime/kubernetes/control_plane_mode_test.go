// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

type modeSSH struct {
	stubSSH
	commands  []string
	failHost  string
	checkOnly bool
	deadlines []time.Duration
}

func (s *modeSSH) CmdAsyncWithContext(ctx context.Context, host string, commands ...string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if deadline, ok := ctx.Deadline(); ok {
		s.deadlines = append(s.deadlines, time.Until(deadline))
	}
	return s.CmdAsync(host, commands...)
}

func (s *modeSSH) CmdAsync(host string, commands ...string) error {
	for _, command := range commands {
		s.commands = append(s.commands, host+"|"+command)
		if host == s.failHost && strings.Contains(command, "switch '") &&
			strings.Contains(command, "--check-only") == s.checkOnly {
			return errors.New("injected conversion failure")
		}
	}
	return nil
}

func TestControlPlaneConversionCommitAndFailure(t *testing.T) {
	for _, failure := range []string{"preflight", "host", "none"} {
		t.Run(failure, func(t *testing.T) {
			previousRoot := constants.DefaultRuntimeRootDir
			constants.DefaultRuntimeRootDir = t.TempDir()
			t.Cleanup(func() {
				constants.DefaultRuntimeRootDir = previousRoot
			})
			cluster := testCluster([]string{"master0", "master1", "master2"})
			path := constants.Clusterfile(cluster.Name)
			if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
				t.Fatal(err)
			}
			data := []byte(
				"apiVersion: sealos.io/v1beta1\nkind: Cluster\nmetadata:\n  name: test\nspec:\n  controlPlaneMode: registered\n",
			)
			if err := os.WriteFile(path, data, 0o600); err != nil {
				t.Fatal(err)
			}
			client := fake.NewSimpleClientset()
			ssh := &modeSSH{
				checkOnly: failure == "preflight",
			}
			if failure != "none" {
				ssh.failHost = "master1"
			}
			rt := &KubeadmRuntime{
				cluster: cluster,
				cli: &stubKubeClient{
					k8s: client,
				},
				execer:       ssh,
				pathResolver: constants.NewPathResolver(cluster.Name),
			}
			options := standalone.ModeOptions{
				Mode:    standalone.ModeStandalone,
				Timeout: 10 * time.Minute,
			}
			err := rt.SwitchControlPlaneMode(context.Background(), options)
			if (err != nil) != (failure != "none") {
				t.Fatalf("unexpected conversion result: %v", err)
			}
			if len(ssh.deadlines) == 0 {
				t.Fatal("conversion did not pass its context to the transport")
			}
			for _, timeout := range ssh.deadlines {
				if timeout < options.Timeout || timeout > options.Timeout+30*time.Second {
					t.Fatalf(
						"transport timeout does not cover the requested conversion: %s",
						timeout,
					)
				}
			}
			data, err = os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			if strings.Contains(
				string(data),
				"controlPlaneMode: standalone",
			) != (failure == "none") {
				t.Fatalf("incorrect mode commit after %s: %s", failure, data)
			}
			_, err = client.CoreV1().
				ConfigMaps("kube-system").
				Get(context.Background(), clusterfile.ModeTransitionResource, metav1.GetOptions{})
			if failure == "host" && err != nil {
				t.Fatalf("lost incomplete conversion journal: %v", err)
			}
			if failure != "host" && !apierrors.IsNotFound(err) {
				t.Fatalf("unexpected pending journal: %v", err)
			}
			if failure == "host" {
				for _, command := range ssh.commands {
					if strings.HasPrefix(command, "master2|") &&
						strings.Contains(command, "switch '") &&
						!strings.Contains(command, "--check-only") {
						t.Fatal("continued converting after a failed master")
					}
				}
				ssh.failHost = ""
				options.Mode = standalone.ModeRegistered
				if err := rt.SwitchControlPlaneMode(context.Background(), options); err != nil {
					t.Fatalf("could not reverse an interrupted conversion: %v", err)
				}
				for _, command := range ssh.commands {
					if strings.Contains(command, "switch 'registered'") &&
						strings.Contains(command, "--route-") {
						t.Fatalf("registered command received standalone flags: %s", command)
					}
				}
			}
		})
	}
}
