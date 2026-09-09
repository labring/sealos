// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"go.etcd.io/etcd/api/v3/etcdserverpb"
	v1 "k8s.io/api/core/v1"
)

func TestEtcdMemberIdentityAndLearnerBootstrap(t *testing.T) {
	members := make([]*etcdserverpb.Member, 0, 3)
	members = append(members, []*etcdserverpb.Member{
		{ID: 2, IsLearner: true, PeerURLs: []string{"https://192.0.2.2:2380"}},
		{ID: 1, Name: "first", PeerURLs: []string{"https://192.0.2.1:2380"}},
	}...)
	member, err := memberByPeer(members, "https://192.0.2.2:2380")
	if err != nil || member == nil || member.ID != 2 {
		t.Fatalf("could not identify unnamed learner: %v, %v", member, err)
	}
	initial, err := initialEtcdCluster(members, 2, "second")
	if err != nil || initial != "first=https://192.0.2.1:2380,second=https://192.0.2.2:2380" {
		t.Fatalf("invalid learner bootstrap: %s, %v", initial, err)
	}
	if _, err := initialEtcdCluster(members, 2, "first"); err == nil {
		t.Fatal("accepted duplicate etcd names")
	}
	members = append(
		members,
		&etcdserverpb.Member{ID: 3, PeerURLs: []string{"https://192.0.2.2:2380"}},
	)
	if _, err := memberByPeer(members, "https://192.0.2.2:2380"); err == nil {
		t.Fatal("accepted ambiguous peer identity")
	}
}

func TestCannotRemoveTheLastEtcdVoter(t *testing.T) {
	members := []*etcdserverpb.Member{
		{ID: 1, Name: "voter"},
		{ID: 2, Name: "learner", IsLearner: true},
	}
	if err := checkRemovalQuorum(context.Background(), nil, members, 1, 10); err == nil {
		t.Fatal("accepted removal of the last voting member")
	}
}

func TestControllerUpdatePreservesUnselectedOptions(t *testing.T) {
	current := RouteControllerOptions{
		Image:      "example/controller:v1",
		Kubeconfig: "/etc/controller/kubeconfig",
		Config:     "/etc/controller/config",
		Table:      200,
		Protocol:   111,
	}
	requested := DefaultRouteControllerOptions()
	requested.Image = "example/controller:v2"
	updated, err := mergeControllerOptions(current, requested, []string{"route-controller-image"})
	if err != nil {
		t.Fatal(err)
	}
	expected := current
	expected.Image = requested.Image
	if updated != expected {
		t.Fatalf("partial controller update discarded other settings: %+v", updated)
	}
	updated, err = mergeControllerOptions(current, requested, []string{"route-controller-config"})
	if err != nil || updated.Config != "" || updated.Table != current.Table {
		t.Fatalf("could not explicitly clear only the config path: %+v, %v", updated, err)
	}
}

func TestEtcdRemovalRejectsUnsafePaths(t *testing.T) {
	for _, path := range []string{"/", "/var", "/var/lib", "/etc/kubernetes", "/var/lib/kubelet/pods", "/var/lib/sealos/other", "/dev/shm/data", "relative", "/data/../etc"} {
		if err := validateEtcdRemovalPath(path); err == nil {
			t.Errorf("accepted unsafe removal path %q", path)
		}
	}
	dir, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink("/etc", filepath.Join(dir, "linked")); err != nil {
		t.Fatal(err)
	}
	if err := validateEtcdRemovalPath(filepath.Join(dir, "linked", "data")); err == nil {
		t.Fatal("followed an etcd data path through a symlink")
	}
}

func TestBootstrapPreservesPublicRegistrationOptions(t *testing.T) {
	data := []byte(`apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.31.9
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
nodeRegistration:
  name: old
  kubeletExtraArgs:
    - name: node-ip
      value: 192.0.2.2
    - name: register-node
      value: "true"
patches:
  directory: /patches
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
authentication:
  webhook:
    enabled: true
`)
	config, err := BootstrapConfig(
		data,
		"v1.31.9",
		"new",
		"192.0.2.2",
		"unix:///run/containerd/containerd.sock",
		6443,
	)
	if err != nil {
		t.Fatal(err)
	}
	_, init, _, err := bootstrapDocuments(config)
	if err != nil {
		t.Fatal(err)
	}
	if init["patches"] == nil {
		t.Fatal("discarded public patches setting")
	}
	registration := testMap(t, init["nodeRegistration"])
	args, err := bootstrapKubeletArgs(registration, "unix:///run/containerd/containerd.sock", "new")
	if err != nil {
		t.Fatal(err)
	}
	args, err = modeArgs(args)
	if err != nil {
		t.Fatal(err)
	}
	if flagValue(args, "node-ip") != "192.0.2.2" || flagValue(args, "register-node") != "false" ||
		flagValue(args, "kubeconfig") != "" {
		t.Fatalf("lost local flags or enabled registration: %v", args)
	}
}

func TestBootstrapBaselinePreservesFutureNodeIdentity(t *testing.T) {
	registration := map[string]any{
		"name": "control-plane",
		"taints": []any{
			map[string]any{
				"key":    "dedicated",
				"value":  "control-plane",
				"effect": "NoSchedule",
			},
		},
	}
	node, err := bootstrapNode(registration, []string{
		"--node-labels=example.com/zone=zone-a",
		"--provider-id=example://control-plane",
	})
	if err != nil {
		t.Fatal(err)
	}
	if node.Name != "control-plane" || node.Labels["example.com/zone"] != "zone-a" ||
		node.Spec.ProviderID != "example://control-plane" {
		t.Fatalf("lost future registered Node identity: %+v", node)
	}
	if len(node.Spec.Taints) != 1 || node.Spec.Taints[0].Key != "dedicated" ||
		node.Spec.Taints[0].Effect != v1.TaintEffectNoSchedule {
		t.Fatalf("lost explicit bootstrap taints: %+v", node.Spec.Taints)
	}
	registration["taints"] = []any{}
	node, err = bootstrapNode(registration, nil)
	if err != nil || len(node.Spec.Taints) != 0 {
		t.Fatalf("empty taints were replaced by defaults: %+v, %v", node, err)
	}
	if _, err := bootstrapNode(
		registration,
		[]string{"--register-with-taints=dedicated=true:NoSchedule"},
	); err == nil {
		t.Fatal("accepted a taint override that bypasses the saved baseline")
	}
}

func TestResetCannotSkipUnmanagedMemberRemoval(t *testing.T) {
	err := Reset(context.Background(), ResetOptions{AllowUninitialized: true})
	if err == nil ||
		err.Error() != "allow-uninitialized is only valid for whole-cluster destruction" {
		t.Fatalf("reset did not reject allow-uninitialized before maintenance: %v", err)
	}
}
