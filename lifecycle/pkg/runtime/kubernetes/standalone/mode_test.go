// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	"sigs.k8s.io/yaml"
)

func TestModeConfigRestoresSettingsAcrossUpgrade(t *testing.T) {
	original := []byte(`apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
staticPodPath: /etc/kubernetes/manifests
rotateCertificates: true
authentication:
  webhook:
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
`)
	converted, baseline, err := convertKubeletConfig(original, nil)
	if err != nil {
		t.Fatal(err)
	}
	var config map[string]any
	if err := yaml.Unmarshal(converted, &config); err != nil {
		t.Fatal(err)
	}
	if config["enableServer"] != false || config["rotateCertificates"] != false {
		t.Fatalf("kubelet API dependencies remain enabled: %s", converted)
	}
	config["maxPods"] = 222
	upgraded, err := yaml.Marshal(config)
	if err != nil {
		t.Fatal(err)
	}
	// Exercise the persisted representation, including fields originally absent.
	saved, err := json.Marshal(baseline)
	if err != nil {
		t.Fatal(err)
	}
	baseline = nil
	if err := json.Unmarshal(saved, &baseline); err != nil {
		t.Fatal(err)
	}
	restored, _, err := convertKubeletConfig(upgraded, baseline)
	if err != nil {
		t.Fatal(err)
	}
	var got, want map[string]any
	if err := yaml.Unmarshal(restored, &got); err != nil {
		t.Fatal(err)
	}
	if err := yaml.Unmarshal(original, &want); err != nil {
		t.Fatal(err)
	}
	want["maxPods"] = float64(222)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("round trip lost settings or reverted upgraded values:\n%s", restored)
	}
}

func TestModeArgsRemoveAPIOverrides(t *testing.T) {
	args, err := modeArgs([]string{
		"--config=/var/lib/kubelet/config.yaml",
		"--kubeconfig", "/etc/kubernetes/kubelet.conf",
		"--register-node=true",
		"--enable-server", "true",
		"--authorization-mode=Webhook",
		"--rotate-certificates=true",
		"--node-ip=192.0.2.5",
	})
	if err != nil {
		t.Fatal(err)
	}
	want := []string{
		"--config=/var/lib/kubelet/config.yaml",
		"--node-ip=192.0.2.5",
		"--kubeconfig=",
		"--bootstrap-kubeconfig=",
		"--register-node=false",
	}
	if !reflect.DeepEqual(args, want) {
		t.Fatalf("unexpected arguments: %v", args)
	}
}

func TestRestoredNodeDoesNotReuseAllocatedCIDRs(t *testing.T) {
	original := &v1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "master",
			UID:             "old-uid",
			ResourceVersion: "old-version",
			Labels: map[string]string{
				"example.com/rack": "one",
			},
		},
		Spec: v1.NodeSpec{
			PodCIDR:  "10.244.0.0/24",
			PodCIDRs: []string{"10.244.0.0/24"},
			Taints: []v1.Taint{
				{
					Key:    "dedicated",
					Effect: v1.TaintEffectNoSchedule,
				},
				{
					Key:    v1.TaintNodeUnreachable,
					Effect: v1.TaintEffectNoExecute,
				},
			},
		},
	}
	endpoint := "unix:///run/containerd/containerd.sock"
	got := restoredNode(original, endpoint)
	if got.Annotations[kubeadmCRISocketAnnotation] != endpoint {
		t.Fatal("restored Node lacks kubeadm runtime discovery metadata")
	}
	if original.Annotations[kubeadmCRISocketAnnotation] != "" {
		t.Fatal("restoration mutated the saved baseline")
	}
	if got.UID != "" || got.ResourceVersion != "" || got.Spec.PodCIDR != "" ||
		len(got.Spec.PodCIDRs) != 0 {
		t.Fatalf("restored stale cluster identity: %+v", got)
	}
	if got.Spec.Unschedulable || len(got.Spec.Taints) != 1 ||
		got.Labels["example.com/rack"] != "one" {
		t.Fatalf("changed schedulability or lost administrator metadata: %+v", got)
	}
}

func TestRegisteredArgsProtectNativeRegistration(t *testing.T) {
	node := &v1.Node{
		ObjectMeta: metav1.ObjectMeta{
			UID: "original-node",
		},
		Spec: v1.NodeSpec{
			Taints: []v1.Taint{
				{
					Key:    "node-role.kubernetes.io/control-plane",
					Effect: v1.TaintEffectNoSchedule,
				},
			},
		},
	}
	args := registeredModeArgs([]string{
		"--config=/var/lib/kubelet/config.yaml",
		"--kubeconfig=/etc/kubernetes/kubelet.conf",
		"--register-node=false",
		"--register-with-taints=old=true:NoSchedule",
	}, node)
	if flagValue(args, "register-node") != "true" {
		t.Fatal("kubelet cannot register itself")
	}
	want := "sealos.io/control-plane-mode=original-node:NoSchedule,node-role.kubernetes.io/control-plane:NoSchedule"
	if flagValue(args, "register-with-taints") != want {
		t.Fatalf("native registration is not protected: %v", args)
	}
	m := &modeSwitch{
		state: &modeState{
			Node: node,
		},
	}
	registered := &v1.Node{
		ObjectMeta: metav1.ObjectMeta{
			UID: "new-node",
		},
		Spec: v1.NodeSpec{
			Taints: []v1.Taint{
				{
					Key:    modeRegistrationTaint,
					Value:  string(node.UID),
					Effect: v1.TaintEffectNoSchedule,
				},
			},
		},
	}
	if !m.ownsRegisteredNode(registered) {
		t.Fatal("cannot resume after kubelet registered and before metadata restoration")
	}
}

func TestRestoreNodeRefusesNameCollision(t *testing.T) {
	client := fake.NewSimpleClientset(&v1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name: "master",
			UID:  "unrelated",
		},
	})
	m := &modeSwitch{
		client: client,
		state: &modeState{
			Node: &v1.Node{
				ObjectMeta: metav1.ObjectMeta{
					Name: "master",
					UID:  "original",
				},
			},
			RegisteredUID: "original",
		},
	}
	if err := m.restoreNode(context.Background()); err == nil {
		t.Fatal("adopted an unrelated Node")
	}
	for _, action := range client.Actions() {
		if action.GetVerb() == "update" || action.GetVerb() == "delete" {
			t.Fatal("modified an unrelated Node")
		}
	}
}
