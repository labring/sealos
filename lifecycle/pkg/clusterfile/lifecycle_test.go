// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"

	"github.com/labring/sealos/pkg/constants"
)

func TestLifecycleAPIResumeAndExclusion(t *testing.T) {
	ctx := context.Background()
	client := fake.NewSimpleClientset()
	op := LifecycleOperation{Action: "apply", Request: "first-request"}
	failure := errors.New("second master failed")
	if err := withLifecycleAPI(ctx, client, op, func(context.Context, LifecycleOperation) error {
		return failure
	}); !errors.Is(err, failure) {
		t.Fatalf("lost host failure: %v", err)
	}
	if err := CheckModeTransition(ctx, client); err == nil {
		t.Fatal("failed operation allowed an unrelated command")
	}
	other := LifecycleOperation{Action: "apply", Request: "different-request"}
	if err := withLifecycleAPI(ctx, client, other, func(context.Context, LifecycleOperation) error {
		t.Fatal("executed a different request")
		return nil
	}); err == nil {
		t.Fatal("accepted a different request")
	}
	if err := withLifecycleAPI(ctx, client, op, func(context.Context, LifecycleOperation) error {
		return nil
	}); err != nil {
		t.Fatalf("same operation could not resume: %v", err)
	}
	if err := CheckModeTransition(ctx, client); err != nil {
		t.Fatalf("completed operation retained a guard: %v", err)
	}
}

func TestResetKeepsAPITombstone(t *testing.T) {
	client := fake.NewSimpleClientset()
	err := withLifecycleAPI(context.Background(), client, LifecycleOperation{Action: "reset", Request: "request"}, func(_ context.Context, operation LifecycleOperation) error {
		if !operation.Approved {
			t.Fatal("reset did not persist offline recovery authorization")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.CoreV1().ConfigMaps("kube-system").Get(context.Background(), LifecycleResource, metav1.GetOptions{}); err != nil {
		t.Fatalf("reset lost its API tombstone: %v", err)
	}
	if _, err := client.CoordinationV1().Leases("kube-system").Get(context.Background(), ModeTransitionResource, metav1.GetOptions{}); !apierrors.IsNotFound(err) {
		t.Fatalf("reset retained the lease after persisting its tombstone: %v", err)
	}
}

func TestLifecycleInventorySurvivesPartialCommit(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() { constants.DefaultRuntimeRootDir = previousRoot })
	name := "lifecycle-test"
	path := constants.Clusterfile(name)
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("original inventory"), 0o600); err != nil {
		t.Fatal(err)
	}
	op := LifecycleOperation{Action: "apply", Request: "request"}
	failure := errors.New("sync failed")
	err := WithLifecycle(context.Background(), name, op, false, func(context.Context) error {
		if err := os.WriteFile(path, []byte("desired inventory"), 0o600); err != nil {
			return err
		}
		return failure
	})
	if !errors.Is(err, failure) {
		t.Fatal(err)
	}
	data, err := readLifecycleInventory(path)
	if err != nil || string(data) != "original inventory" {
		t.Fatalf("retry read partly committed inventory: %q, %v", data, err)
	}
	if err := WithLifecycle(context.Background(), name, op, false, func(context.Context) error { return nil }); err != nil {
		t.Fatal(err)
	}
	data, err = readLifecycleInventory(path)
	if err != nil || string(data) != "desired inventory" {
		t.Fatalf("completion did not expose desired inventory: %q, %v", data, err)
	}
}

func TestResetSupersedesOnlyTheCompletePendingInventory(t *testing.T) {
	ctx := context.Background()
	client := fake.NewSimpleClientset()
	previous := LifecycleOperation{Action: "apply", Request: "join", Hosts: []string{"192.0.2.1", "192.0.2.2"}}
	_ = withLifecycleAPI(ctx, client, previous, func(context.Context, LifecycleOperation) error {
		return errors.New("new master failed readiness")
	})
	reset := LifecycleOperation{Action: "reset", Request: "reset", Hosts: []string{"192.0.2.1"}}
	if err := withLifecycleAPI(ctx, client, reset, func(context.Context, LifecycleOperation) error {
		t.Fatal("reset omitted the partially joined master")
		return nil
	}); err == nil {
		t.Fatal("allowed an incomplete reset inventory")
	}
	reset.Hosts = previous.Hosts
	if err := withLifecycleAPI(ctx, client, reset, func(context.Context, LifecycleOperation) error {
		return nil
	}); err != nil {
		t.Fatalf("explicit full reset could not take over failed join: %v", err)
	}
}

func TestResetCanReadAnUncommittedInitialInventory(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "Clusterfile")
	data := []byte("apiVersion: sealos.io/v1beta1\nkind: Cluster\nmetadata:\n  name: test\nspec:\n  controlPlaneMode: standalone\n  hosts:\n  - ips: [192.0.2.1]\n    roles: [master]\n")
	if err := WriteMaintenanceJSON(filepath.Join(root, LifecycleFilename), lifecycleInventory{RecoveryInventory: data}); err != nil {
		t.Fatal(err)
	}
	cf := NewClusterFile(path, WithLifecycleReset())
	if err := cf.Process(); err != nil {
		t.Fatalf("reset could not load a failed initial installation: %v", err)
	}
	if cf.GetCluster() == nil || !cf.GetCluster().IsStandaloneControlPlane() {
		t.Fatal("reset lost the pending initial cluster mode")
	}
}
