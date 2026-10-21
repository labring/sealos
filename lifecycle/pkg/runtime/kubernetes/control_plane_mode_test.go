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
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
)

type modeSSH struct {
	stubSSH
	commands   []string
	failHost   string
	checkOnly  bool
	deadlines  []time.Duration
	syncSource string
}

func (s *modeSSH) Cmd(host, command string) ([]byte, error) {
	if s.syncSource != "" && command == "uname -m" {
		return []byte(runtime.GOARCH), nil
	}
	return s.stubSSH.Cmd(host, command)
}

func (s *modeSSH) Copy(host, source, target string) error {
	if err := s.stubSSH.Copy(host, source, target); err != nil {
		return err
	}
	if source == s.syncSource {
		return errors.New("injected sealctl sync failure")
	}
	return nil
}

func (s *modeSSH) Fetch(host, source, target string) error {
	return os.WriteFile(target, []byte(source), 0o600)
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

func boolPtr(v bool) *bool { return &v }

func TestControlPlaneConversionCommitAndFailure(t *testing.T) {
	for _, scenario := range []struct {
		failure        string
		recover        string
		image          string
		flag           string
		kubeconfig     string
		flagKubeconfig string
		config         string
		table          int
		protocol       int
		enabled        *bool
		flagEnabled    *bool
		syncFailure    bool
	}{
		{failure: "preflight"},
		{failure: "host", recover: standalone.ModeStandalone},
		{failure: "host", recover: standalone.ModeRegistered},
		{failure: "none"},
		{failure: "none", syncFailure: true},
		{failure: "preflight", syncFailure: true},
		{failure: "none", image: "registry.example/controller:custom"},
		{failure: "none", image: "registry.example/controller:custom", flag: "registry.example/controller:override"},
		{
			failure:    "none",
			kubeconfig: "/etc/kubernetes/route-controller/kc",
			config:     "/etc/route-controller/config.yaml",
			table:      200,
			protocol:   88,
		},
		{
			failure:        "none",
			kubeconfig:     "/etc/kubernetes/route-controller/saved",
			flagKubeconfig: "/etc/kubernetes/route-controller/override",
		},
		{failure: "none", enabled: boolPtr(false)},
		{failure: "none", flagEnabled: boolPtr(false)},
		{failure: "none", enabled: boolPtr(false), flagEnabled: boolPtr(true)},
	} {
		t.Run(scenario.failure+"/"+scenario.recover, func(t *testing.T) {
			if scenario.syncFailure && runtime.GOOS != "linux" {
				t.Skip("local sealctl discovery requires Linux")
			}
			failure := scenario.failure
			previousRoot := constants.DefaultRuntimeRootDir
			constants.DefaultRuntimeRootDir = t.TempDir()
			t.Cleanup(func() {
				constants.DefaultRuntimeRootDir = previousRoot
			})
			cluster := testCluster([]string{"master0", "master1", "master2"})
			cluster.Spec.RouteController = &v2.RouteControllerConfig{
				Enabled:    scenario.enabled,
				Image:      scenario.image,
				Kubeconfig: scenario.kubeconfig,
				Config:     scenario.config,
				Table:      scenario.table,
				Protocol:   scenario.protocol,
			}
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
			seed := []k8sruntime.Object{&v1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{Name: "kubeadm-config", Namespace: "kube-system"},
				Data:       map[string]string{"ClusterConfiguration": "etcd:\n  local: {}\n"},
			}}
			scenarioDisables := scenario.flagEnabled != nil && !*scenario.flagEnabled ||
				scenario.enabled != nil && !*scenario.enabled && scenario.flagEnabled == nil
			if scenarioDisables {
				seed = append(seed, managedControllerIdentity()...)
			}
			client := fake.NewSimpleClientset(seed...)
			ssh := &modeSSH{
				checkOnly: failure == "preflight",
			}
			if scenario.syncFailure {
				ssh.syncSource = filepath.Join(t.TempDir(), "sealctl")
				if err := os.WriteFile(ssh.syncSource, []byte("test binary"), 0o700); err != nil {
					t.Fatal(err)
				}
				t.Setenv("SEALOS_SEALCTL_PATH", ssh.syncSource)
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
			expectedKubeconfig := scenario.kubeconfig
			expectedEnabled := scenario.enabled == nil || *scenario.enabled
			expectEnabledFlag := scenario.enabled != nil
			if scenario.flag != "" || scenario.flagKubeconfig != "" || scenario.flagEnabled != nil {
				controller := standalone.DefaultRouteControllerOptions()
				var selected []string
				if scenario.flag != "" {
					controller.Image = scenario.flag
					selected = append(selected, "route-controller-image")
					expectedImage = scenario.flag
				}
				if scenario.flagKubeconfig != "" {
					controller.Kubeconfig = scenario.flagKubeconfig
					selected = append(selected, "route-controller-kubeconfig")
					expectedKubeconfig = scenario.flagKubeconfig
				}
				if scenario.flagEnabled != nil {
					controller.Enabled = *scenario.flagEnabled
					selected = append(selected, "route-controller-enabled")
					expectedEnabled = *scenario.flagEnabled
					expectEnabledFlag = true
				}
				options.RouteController = &controller
				options.ControllerFields = selected
			}
			err := rt.SwitchControlPlaneMode(context.Background(), options)
			if (err != nil) != (failure != "none") {
				t.Fatalf("unexpected conversion result: %v", err)
			}
			if scenario.syncFailure {
				attempted := false
				for _, call := range ssh.copyCalls {
					if strings.Contains(call, "|"+ssh.syncSource+"|") {
						attempted = true
					}
				}
				if !attempted {
					t.Fatal("sealctl synchronization was not attempted")
				}
			}
			if failure == "preflight" {
				for _, command := range ssh.commands {
					if strings.Contains(command, "switch '") &&
						!strings.Contains(command, "--check-only") {
						t.Fatal("started conversion after a failed preflight")
					}
				}
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
			assertControllerSelection(t, ssh.commands[0], string(data),
				expectedImage, expectedKubeconfig, scenario.table,
				expectedEnabled, expectEnabledFlag)
			if failure == "none" && scenarioDisables {
				assertControllerIdentityRemoved(t, client)
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
				recoverInterruptedConversion(t, rt, ssh, client, options, scenario.recover)
			}
		})
	}
}

func assertControllerSelection(
	t *testing.T,
	command, data string,
	image, kubeconfig string,
	table int,
	enabled, enabledSelected bool,
) {
	t.Helper()
	if image != "" {
		if !strings.Contains(data, "image: "+image) {
			t.Fatalf("controller image was not committed: %s", data)
		}
		if !strings.Contains(command, "--route-controller-image '"+image+"'") {
			t.Fatalf("incorrect controller image selection: %s", command)
		}
	}
	if kubeconfig != "" {
		if !strings.Contains(data, "kubeconfig: "+kubeconfig) {
			t.Fatalf("controller kubeconfig was not committed: %s", data)
		}
		if !strings.Contains(command, "--route-controller-kubeconfig '"+kubeconfig+"'") {
			t.Fatalf("incorrect controller kubeconfig selection: %s", command)
		}
	}
	if table != 0 {
		tableValue := strconv.Itoa(table)
		if !strings.Contains(command, "--route-table '"+tableValue+"'") {
			t.Fatalf("incorrect route table selection: %s", command)
		}
		if !strings.Contains(data, "table: "+tableValue) {
			t.Fatalf("route table was not committed: %s", data)
		}
	}
	if enabledSelected {
		value := strconv.FormatBool(enabled)
		if !strings.Contains(command, "--route-controller-enabled="+value) {
			t.Fatalf("incorrect controller enabled selection: %s", command)
		}
		if !strings.Contains(data, "enabled: "+value) {
			t.Fatalf("controller enabled was not committed: %s", data)
		}
	}
}

func managedControllerIdentity() []k8sruntime.Object {
	managed := map[string]string{"sealos.io/route-controller": "managed"}
	return []k8sruntime.Object{
		&v1.Secret{ObjectMeta: metav1.ObjectMeta{
			Name: "sealos-route-controller", Namespace: "kube-system", Labels: managed,
		}},
		&v1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{
			Name: "sealos-route-controller", Namespace: "kube-system", Labels: managed,
		}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{
			Name: "sealos-route-controller", Labels: managed,
		}},
		&rbacv1.ClusterRoleBinding{ObjectMeta: metav1.ObjectMeta{
			Name: "sealos-route-controller", Labels: managed,
		}},
		&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{
			Name: "sealos-route-controller", Namespace: "kube-system", Labels: managed,
		}},
		&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{
			Name: "sealos-route-controller", Namespace: "kube-system", Labels: managed,
		}},
	}
}

func assertControllerIdentityRemoved(t *testing.T, client *fake.Clientset) {
	t.Helper()
	lookups := []func() error{
		func() error {
			_, err := client.CoreV1().Secrets("kube-system").
				Get(context.Background(), "sealos-route-controller", metav1.GetOptions{})
			return err
		},
		func() error {
			_, err := client.CoreV1().ServiceAccounts("kube-system").
				Get(context.Background(), "sealos-route-controller", metav1.GetOptions{})
			return err
		},
		func() error {
			_, err := client.RbacV1().ClusterRoles().
				Get(context.Background(), "sealos-route-controller", metav1.GetOptions{})
			return err
		},
		func() error {
			_, err := client.RbacV1().ClusterRoleBindings().
				Get(context.Background(), "sealos-route-controller", metav1.GetOptions{})
			return err
		},
		func() error {
			_, err := client.RbacV1().Roles("kube-system").
				Get(context.Background(), "sealos-route-controller", metav1.GetOptions{})
			return err
		},
		func() error {
			_, err := client.RbacV1().RoleBindings("kube-system").
				Get(context.Background(), "sealos-route-controller", metav1.GetOptions{})
			return err
		},
	}
	for _, lookup := range lookups {
		if err := lookup(); !apierrors.IsNotFound(err) {
			t.Fatalf("managed controller identity survived a disable: %v", err)
		}
	}
}

func recoverInterruptedConversion(
	t *testing.T,
	rt *KubeadmRuntime,
	ssh *modeSSH,
	client *fake.Clientset,
	options standalone.ModeOptions,
	target string,
) {
	t.Helper()
	for _, command := range ssh.commands {
		if strings.HasPrefix(command, "master2|") &&
			strings.Contains(command, "switch '") &&
			!strings.Contains(command, "--check-only") {
			t.Fatal("continued converting after a failed master")
		}
	}
	ssh.failHost = ""
	options.Mode = target
	if err := rt.SwitchControlPlaneMode(context.Background(), options); err != nil {
		t.Fatalf("could not recover an interrupted conversion to %s: %v", target, err)
	}
	_, err := client.CoreV1().ConfigMaps("kube-system").Get(
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
