// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	clienttesting "k8s.io/client-go/testing"
)

type workerSSH struct {
	stubSSH
	hostname string
	fail     string
	commands []string
}

func (s *workerSSH) CmdToString(host, command, separator string) (string, error) {
	return s.hostname, nil
}

func (s *workerSSH) CmdAsync(host string, commands ...string) error {
	for _, command := range commands {
		s.commands = append(s.commands, command)
		if s.fail != "" && strings.Contains(command, s.fail) {
			return errors.New("injected worker cleanup failure")
		}
	}
	return nil
}

func workerFixture(mode string) (*KubeadmRuntime, *fake.Clientset, *workerSSH) {
	node := &v1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: "worker", UID: "original-worker"},
		Status: v1.NodeStatus{
			Addresses:  []v1.NodeAddress{{Type: v1.NodeInternalIP, Address: "192.0.2.2"}},
			Conditions: []v1.NodeCondition{{Type: v1.NodeReady, Status: v1.ConditionTrue}},
		},
	}
	client := fake.NewSimpleClientset(node)
	execer := &workerSSH{hostname: "worker"}
	cluster := testClusterWithNodes([]string{"192.0.2.1"}, []string{"192.0.2.2"})
	cluster.Spec.ControlPlaneMode = mode
	runtime := &KubeadmRuntime{
		cluster:       cluster,
		cli:           &stubKubeClient{k8s: client},
		execer:        execer,
		remoteUtil:    ssh.NewRemoteFromSSH("worker-test", execer),
		kubeadmConfig: types.NewKubeadmConfig(),
	}
	return runtime, client, execer
}

func TestWorkerJoinRetryIsSharedAcrossModes(t *testing.T) {
	for _, mode := range []string{v2.ControlPlaneModeRegistered, v2.ControlPlaneModeStandalone} {
		t.Run(mode, func(t *testing.T) {
			runtime, _, execer := workerFixture(mode)
			if err := runtime.joinNodes([]string{"192.0.2.2"}); err != nil {
				t.Fatal(err)
			}
			if len(execer.commands) != 0 {
				t.Fatal("repeated kubeadm join on an already Ready worker")
			}
			execer.hostname = "different-host"
			if err := runtime.joinNodes([]string{"192.0.2.2"}); err == nil {
				t.Fatal("accepted a different host using the worker address")
			}
		})
	}
}

func TestWorkerCleanupFailurePreservesNodeAcrossModes(t *testing.T) {
	for _, mode := range []string{v2.ControlPlaneModeRegistered, v2.ControlPlaneModeStandalone} {
		for _, fail := range []string{"systemctl stop", "kubeadm reset", "ipvs"} {
			t.Run(mode+"/"+fail, func(t *testing.T) {
				runtime, client, execer := workerFixture(mode)
				execer.fail = fail
				if err := runtime.ScaleDown(nil, []string{"192.0.2.2"}); err == nil {
					t.Fatal("worker cleanup failure was swallowed")
				}
				for _, action := range client.Actions() {
					if action.GetVerb() == "delete" {
						t.Fatal("deleted Node after host cleanup failed")
					}
				}
			})
		}
	}
}

func TestWorkerDeletionUsesUIDAndAllowsRetry(t *testing.T) {
	runtime, client, execer := workerFixture(v2.ControlPlaneModeRegistered)
	if err := runtime.deleteNodes([]string{"192.0.2.2"}); err != nil {
		t.Fatal(err)
	}
	if len(execer.commands) == 0 ||
		!strings.Contains(execer.commands[0], "systemctl stop kubelet") {
		t.Fatal("worker cleanup did not stop kubelet first")
	}
	for _, action := range client.Actions() {
		if action.GetVerb() == "delete" {
			deletion, ok := action.(clienttesting.DeleteAction)
			if !ok {
				t.Fatalf("unexpected delete action %T", action)
			}
			options := deletion.GetDeleteOptions()
			if options.Preconditions == nil || options.Preconditions.UID == nil ||
				*options.Preconditions.UID != "original-worker" {
				t.Fatal("worker deletion did not constrain the original UID")
			}
		}
	}
	if err := runtime.deleteNodes([]string{"192.0.2.2"}); err != nil {
		t.Fatalf("could not resume cleanup of an absent worker: %v", err)
	}
}

func TestWorkerOperationsRejectControlPlaneIdentity(t *testing.T) {
	runtime, client, execer := workerFixture(v2.ControlPlaneModeRegistered)
	node, err := client.CoreV1().Nodes().Get(context.Background(), "worker", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	node.Labels = map[string]string{"node-role.kubernetes.io/master": ""}
	if _, err := client.CoreV1().
		Nodes().
		Update(context.Background(), node, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	if err := runtime.deleteNodes([]string{"192.0.2.2"}); err == nil {
		t.Fatal("deleted a control plane through the worker path")
	}
	if _, err := runtime.pendingWorkerJoins([]string{"192.0.2.2"}); err == nil {
		t.Fatal("adopted a control plane through the worker path")
	}
	if len(execer.commands) != 0 {
		t.Fatal("mutated the host before checking its role")
	}
}
