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
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
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
	for _, scenario := range []struct {
		failure string
		recover string
		image   string
		flag    string
	}{
		{failure: "preflight"},
		{failure: "host", recover: standalone.ModeStandalone},
		{failure: "host", recover: standalone.ModeRegistered},
		{failure: "none"},
		{failure: "none", image: "registry.example/controller:custom"},
		{failure: "none", image: "registry.example/controller:custom", flag: "registry.example/controller:override"},
	} {
		t.Run(scenario.failure+"/"+scenario.recover, func(t *testing.T) {
			failure := scenario.failure
			previousRoot := constants.DefaultRuntimeRootDir
			constants.DefaultRuntimeRootDir = t.TempDir()
			t.Cleanup(func() {
				constants.DefaultRuntimeRootDir = previousRoot
			})
			cluster := testCluster([]string{"master0", "master1", "master2"})
			cluster.Spec.RouteController = &v2.RouteControllerConfig{Image: scenario.image}
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
				Mode:             standalone.ModeStandalone,
				Timeout:          10 * time.Minute,
				ControllerFields: []string{},
			}
			expectedImage := scenario.image
			if scenario.flag != "" {
				controller := standalone.DefaultRouteControllerOptions()
				controller.Image = scenario.flag
				options.RouteController = &controller
				options.ControllerFields = []string{"route-controller-image"}
				expectedImage = scenario.flag
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
			if failure == "none" && expectedImage != "" {
				if !strings.Contains(string(data), "image: "+expectedImage) {
					t.Fatalf("controller image was not committed: %s", data)
				}
				imageArgument := "--route-controller-image '" + expectedImage + "'"
				if !strings.Contains(ssh.commands[0], imageArgument) {
					t.Fatalf("incorrect controller image selection: %s", ssh.commands[0])
				}
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
				options.Mode = scenario.recover
				if err := rt.SwitchControlPlaneMode(context.Background(), options); err != nil {
					t.Fatalf(
						"could not recover an interrupted conversion to %s: %v",
						options.Mode,
						err,
					)
				}
				_, err = client.CoreV1().ConfigMaps("kube-system").Get(
					context.Background(), clusterfile.ModeTransitionResource, metav1.GetOptions{},
				)
				if !apierrors.IsNotFound(err) {
					t.Fatalf("recovered conversion retained its journal: %v", err)
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
