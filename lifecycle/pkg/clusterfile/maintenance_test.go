// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"context"
	"errors"
	"strings"
	"testing"

	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	clienttesting "k8s.io/client-go/testing"
)

func TestModeCommitPreservesOtherDocuments(t *testing.T) {
	data := []byte(`apiVersion: sealos.io/v1beta1
kind: Cluster
metadata:
  name: test
spec:
  image: [example/kubernetes:v1.31.9]
  customField: preserved
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: 10.244.0.0/16
---
apiVersion: sealos.io/v1beta1
kind: Config
spec:
  data: preserved
`)
	for _, mode := range []string{"standalone", "registered"} {
		var err error
		data, err = replaceControlPlaneMode(data, mode)
		if err != nil {
			t.Fatal(err)
		}
		for _, value := range []string{
			"controlPlaneMode: " + mode,
			"customField: preserved",
			"kind: ClusterConfiguration",
			"podSubnet: 10.244.0.0/16",
			"kind: Config",
			"data: preserved",
		} {
			if !strings.Contains(string(data), value) {
				t.Fatalf("mode commit lost %q: %s", value, data)
			}
		}
	}
}

func TestModeLeaseExcludesAnotherConversionAndReleasesOnFailure(t *testing.T) {
	client := fake.NewSimpleClientset()
	expected := errors.New("host conversion failed")
	err := WithModeLease(context.Background(), client, func(ctx context.Context) error {
		if err := CheckModeTransition(ctx, client); err == nil {
			t.Error("another lifecycle command ignored the active lease")
		}
		if err := WithModeLease(ctx, client, func(context.Context) error {
			t.Error("concurrent conversion acquired the active lease")
			return nil
		}); err == nil {
			t.Error("concurrent conversion was accepted")
		}
		return expected
	})
	if !errors.Is(err, expected) {
		t.Fatalf("lost the conversion error: %v", err)
	}
	_, err = client.CoordinationV1().Leases("kube-system").Get(context.Background(), ModeTransitionResource, metav1.GetOptions{})
	if !apierrors.IsNotFound(err) {
		t.Fatalf("conversion retained its lease: %v", err)
	}
}

func TestModeJournalBlocksLifecycleAfterLeaseExpires(t *testing.T) {
	client := fake.NewSimpleClientset(&v1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ModeTransitionResource,
			Namespace: "kube-system",
		},
	})
	if err := CheckModeTransition(context.Background(), client); err == nil {
		t.Fatal("incomplete conversion did not block lifecycle operations")
	}
	if err := checkOptionalModeTransition(context.Background(), client, false); err == nil {
		t.Fatal("an old inventory ignored a visible pending journal")
	}
}

func TestModeGuardPreservesLegacyOfflineReset(t *testing.T) {
	client := fake.NewSimpleClientset()
	offline := errors.New("API is unavailable")
	client.PrependReactor("get", "configmaps", func(clienttesting.Action) (bool, runtime.Object, error) {
		return true, nil, offline
	})
	if err := checkOptionalModeTransition(context.Background(), client, false); err != nil {
		t.Fatalf("legacy offline reset was blocked: %v", err)
	}
	if err := checkOptionalModeTransition(context.Background(), client, true); !errors.Is(err, offline) {
		t.Fatalf("managed inventory bypassed API verification: %v", err)
	}
}
