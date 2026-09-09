// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes/fake"
	clienttesting "k8s.io/client-go/testing"
)

type standaloneSSH struct {
	stubSSH
	commands  []string
	failHost  string
	checkOnly bool
}

func TestUpgradedWorkerRequiresFreshReadyCondition(t *testing.T) {
	restartedAt := time.Unix(1700000000, 0)
	target := semver.MustParse("1.28.15")
	for _, test := range []struct {
		name      string
		version   string
		status    v1.ConditionStatus
		heartbeat time.Time
		wantReady bool
	}{
		{"stale ready", "v1.28.15", v1.ConditionTrue, restartedAt.Add(-time.Second), false},
		{"same second", "v1.28.15", v1.ConditionTrue, restartedAt, false},
		{"fresh ready", "v1.28.15", v1.ConditionTrue, restartedAt.Add(time.Second), true},
		{"fresh not ready", "v1.28.15", v1.ConditionFalse, restartedAt.Add(time.Second), false},
		{"old version", "v1.28.14", v1.ConditionTrue, restartedAt.Add(time.Second), false},
	} {
		t.Run(test.name, func(t *testing.T) {
			node := &v1.Node{
				Status: v1.NodeStatus{
					NodeInfo: v1.NodeSystemInfo{KubeletVersion: test.version},
					Conditions: []v1.NodeCondition{
						{
							Type:              v1.NodeReady,
							Status:            test.status,
							LastHeartbeatTime: metav1.NewTime(test.heartbeat),
						},
					},
				},
			}
			if ready := upgradedWorkerReady(node, target, restartedAt); ready != test.wantReady {
				t.Fatalf("ready = %t, want %t", ready, test.wantReady)
			}
		})
	}
}

func TestStandaloneAddonRejectsIncompleteRollout(t *testing.T) {
	daemonSet := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:       "kube-proxy",
			Namespace:  "kube-system",
			Generation: 2,
		},
		Status: appsv1.DaemonSetStatus{
			ObservedGeneration:     1,
			DesiredNumberScheduled: 1,
			UpdatedNumberScheduled: 1,
			NumberAvailable:        1,
		},
	}
	client := fake.NewSimpleClientset(daemonSet)
	ready, err := standaloneAddonReady(context.Background(), client, "kube-proxy")
	if err != nil || ready {
		t.Fatalf("accepted a stale controller status: %t, %v", ready, err)
	}
	daemonSet.Status.ObservedGeneration = 2
	daemonSet.Status.NumberAvailable = 0
	if _, err := client.AppsV1().
		DaemonSets("kube-system").
		UpdateStatus(context.Background(), daemonSet, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	ready, err = standaloneAddonReady(context.Background(), client, "kube-proxy")
	if err != nil || ready {
		t.Fatalf("accepted a crashing addon: %t, %v", ready, err)
	}
	daemonSet.Status.NumberAvailable = 1
	if _, err := client.AppsV1().
		DaemonSets("kube-system").
		UpdateStatus(context.Background(), daemonSet, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	ready, err = standaloneAddonReady(context.Background(), client, "kube-proxy")
	if err != nil || !ready {
		t.Fatalf("healthy rollout was not recognized: %t, %v", ready, err)
	}
}

func (s *standaloneSSH) CmdAsync(host string, commands ...string) error {
	for _, command := range commands {
		s.commands = append(s.commands, host+"|"+command)
		isUpgrade := strings.Contains(command, "standalone-upgrade") &&
			strings.Contains(command, "--version")
		isCheck := strings.Contains(command, "--check-only")
		if isUpgrade && host == s.failHost && isCheck == s.checkOnly {
			return errors.New("injected host failure")
		}
	}
	return nil
}

func TestStandaloneUpgradeStopsAtFailedHost(t *testing.T) {
	for _, checkOnly := range []bool{true, false} {
		t.Run(fmt.Sprintf("preflight=%t", checkOnly), func(t *testing.T) {
			previousRoot := constants.DefaultRuntimeRootDir
			constants.DefaultRuntimeRootDir = t.TempDir()
			t.Cleanup(func() {
				constants.DefaultRuntimeRootDir = previousRoot
			})
			cluster := testCluster([]string{"master0", "master1", "master2"})
			cluster.Spec.ControlPlaneMode = v2.ControlPlaneModeStandalone
			cluster.Status.Mounts = []v2.MountImage{
				{
					Type: v2.RootfsImage,
					Labels: map[string]string{
						v2.ImageKubeVersionKey: "v1.30.13",
					},
				},
			}
			client := fake.NewSimpleClientset(
				&v1.ConfigMap{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "kubeadm-config",
						Namespace: "kube-system",
					},
					Data: map[string]string{
						"ClusterConfiguration": "apiVersion: kubeadm.k8s.io/v1beta3\nkind: ClusterConfiguration\n",
					},
				},
				&v1.ConfigMap{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "kubelet-config",
						Namespace: "kube-system",
					},
					Data: map[string]string{
						"kubelet": "apiVersion: kubelet.config.k8s.io/v1beta1\nkind: KubeletConfiguration\n",
					},
				},
			)
			execer := &standaloneSSH{
				failHost:  "master1",
				checkOnly: checkOnly,
			}
			runtime := &KubeadmRuntime{
				cluster: cluster,
				cli: &stubKubeClient{
					k8s: client,
				},
				execer:        execer,
				kubeadmConfig: types.NewKubeadmConfig(),
				pathResolver:  constants.NewPathResolver("test-cluster"),
			}
			err := runtime.Upgrade("v1.31.9")
			if err == nil || !strings.Contains(err.Error(), "injected host failure") {
				t.Fatalf("expected SSH failure, got %v", err)
			}
			var applied []string
			for _, command := range execer.commands {
				if strings.Contains(command, "--version") &&
					!strings.Contains(command, "--check-only") {
					applied = append(applied, strings.SplitN(command, "|", 2)[0])
				}
				if strings.Contains(command, "upload-config") {
					t.Fatal("published cluster configuration after a failed upgrade")
				}
			}
			if checkOnly && len(applied) != 0 {
				t.Fatalf("mutated control planes after preflight failure: %v", applied)
			}
			if !checkOnly && strings.Join(applied, ",") != "master0,master1" {
				t.Fatalf("did not stop at the failed master: %v", applied)
			}
			for _, action := range client.Actions() {
				if action.GetResource().Resource == "nodes" ||
					action.GetResource().Resource == "pods" {
					t.Fatalf("standalone upgrade depends on control-plane API objects: %v", action)
				}
			}
		})
	}
}

type upgradeRetrySSH struct {
	workerSSH
	client *fake.Clientset
}

func (s *upgradeRetrySSH) CmdToString(host, command, separator string) (string, error) {
	if !strings.Contains(command, "date +%s") {
		return "/root", nil
	}
	node, err := s.client.CoreV1().Nodes().Get(context.Background(), "worker", metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	node.Status.NodeInfo.KubeletVersion = "v1.30.14"
	node.Status.Conditions[0].LastHeartbeatTime = metav1.NewTime(time.Now().Add(time.Second))
	if _, err := s.client.CoreV1().
		Nodes().
		UpdateStatus(context.Background(), node, metav1.UpdateOptions{}); err != nil {
		return "", err
	}
	return strconv.FormatInt(time.Now().Unix(), 10), nil
}

func TestStandaloneWorkerUpgradeRetryPreservesSchedulingState(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRoot
	})
	for _, preCordoned := range []bool{false, true} {
		t.Run(fmt.Sprintf("preCordoned=%t", preCordoned), func(t *testing.T) {
			runtime, client, _ := workerFixture(v2.ControlPlaneModeStandalone)
			runtime.pathResolver = constants.NewPathResolver("test-cluster")
			runtime.cluster.Status.Mounts = []v2.MountImage{
				{
					Type:   v2.RootfsImage,
					Labels: map[string]string{v2.ImageKubeVersionKey: "v1.30.13"},
				},
			}
			node, err := client.CoreV1().
				Nodes().
				Get(context.Background(), "worker", metav1.GetOptions{})
			if err != nil {
				t.Fatal(err)
			}
			node.Spec.Unschedulable = preCordoned
			node.Status.NodeInfo.KubeletVersion = "v1.30.13"
			if _, err := client.CoreV1().
				Nodes().
				Update(context.Background(), node, metav1.UpdateOptions{}); err != nil {
				t.Fatal(err)
			}
			for _, config := range []struct {
				name  string
				key   string
				value string
			}{
				{"kubeadm-config", "ClusterConfiguration", "apiVersion: kubeadm.k8s.io/v1beta3\nkind: ClusterConfiguration\n"},
				{"kubelet-config", "kubelet", "apiVersion: kubelet.config.k8s.io/v1beta1\nkind: KubeletConfiguration\n"},
			} {
				_, err := client.CoreV1().
					ConfigMaps("kube-system").
					Create(context.Background(), &v1.ConfigMap{
						ObjectMeta: metav1.ObjectMeta{Name: config.name, Namespace: "kube-system"},
						Data:       map[string]string{config.key: config.value},
					}, metav1.CreateOptions{})
				if err != nil {
					t.Fatal(err)
				}
			}
			execer := &upgradeRetrySSH{client: client}
			execer.fail = "kubeadm upgrade node phase kubelet-config"
			runtime.execer = execer
			if err := runtime.upgradeStandaloneCluster(
				"v1.30.14",
			); err == nil ||
				!strings.Contains(err.Error(), "injected") {
				t.Fatalf("expected worker upgrade failure, got %v", err)
			}
			failed, err := client.CoreV1().
				Nodes().
				Get(context.Background(), "worker", metav1.GetOptions{})
			if err != nil {
				t.Fatal(err)
			}
			if !failed.Spec.Unschedulable {
				t.Fatal("failed upgrade made the worker schedulable")
			}
			if owned := failed.Annotations[workerUpgradeCordonAnnotation] != ""; owned == preCordoned {
				t.Fatalf(
					"cordon ownership does not preserve the administrator's setting: %v",
					failed.Annotations,
				)
			}
			// Use a fresh executor so recovery depends only on persisted state.
			runtime.execer = &upgradeRetrySSH{client: client}
			if err := runtime.upgradeStandaloneCluster("v1.30.14"); err != nil {
				t.Fatalf("retry failed: %v", err)
			}
			upgraded, err := client.CoreV1().
				Nodes().
				Get(context.Background(), "worker", metav1.GetOptions{})
			if err != nil {
				t.Fatal(err)
			}
			if upgraded.Spec.Unschedulable != preCordoned {
				t.Fatalf(
					"retry changed the original scheduling state: %t",
					upgraded.Spec.Unschedulable,
				)
			}
			if _, exists := upgraded.Annotations[workerUpgradeCordonAnnotation]; exists {
				t.Fatal("successful upgrade retained its cordon annotation")
			}
		})
	}
}

func TestWorkerUpgradeCordonRejectsReplacedNode(t *testing.T) {
	_, client, _ := workerFixture(v2.ControlPlaneModeStandalone)
	node, err := client.CoreV1().Nodes().Get(context.Background(), "worker", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	replacement := node.DeepCopy()
	replacement.UID = "replacement-worker"
	replacement.Spec.Unschedulable = true
	replacement.Annotations = map[string]string{workerUpgradeCordonAnnotation: "v1.30.14"}
	if _, err := client.CoreV1().
		Nodes().
		Update(context.Background(), replacement, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	if err := setWorkerUpgradeCordon(
		context.Background(),
		client,
		node,
		"v1.30.14",
		false,
	); err == nil {
		t.Fatal("uncordoned a replacement Node")
	}
	for _, action := range client.Actions() {
		if action.GetVerb() == "patch" {
			t.Fatal("modified the replacement Node")
		}
	}
}

func TestWorkerUpgradeCordonPreservesConcurrentAdministratorCordon(t *testing.T) {
	_, client, _ := workerFixture(v2.ControlPlaneModeStandalone)
	ctx := context.Background()
	node, err := client.CoreV1().Nodes().Get(ctx, "worker", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	patches := 0
	client.PrependReactor(
		"patch",
		"nodes",
		func(clienttesting.Action) (bool, k8sruntime.Object, error) {
			patches++
			current := node.DeepCopy()
			current.Spec.Unschedulable = true
			current.ResourceVersion = "2"
			if err := client.Tracker().
				Update(v1.SchemeGroupVersion.WithResource("nodes"), current, ""); err != nil {
				return true, nil, err
			}
			return true, nil, apierrors.NewConflict(
				schema.GroupResource{
					Resource: "nodes",
				},
				node.Name,
				errors.New("concurrent administrator cordon"),
			)
		},
	)
	if err := setWorkerUpgradeCordon(ctx, client, node, "v1.30.14", true); err != nil {
		t.Fatal(err)
	}
	if err := setWorkerUpgradeCordon(ctx, client, node, "v1.30.14", false); err != nil {
		t.Fatal(err)
	}
	if patches != 1 {
		t.Fatalf("modified an administrator cordon after conflict: %d patches", patches)
	}
}
