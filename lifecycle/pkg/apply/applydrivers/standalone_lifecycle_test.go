// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package applydrivers

import (
	"context"
	"errors"
	"net"
	"os"
	"path/filepath"
	"testing"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/unshare"
	"github.com/labring/sealos/pkg/utils/yaml"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestStandaloneCommitPreservesLocalRecoveryUntilCompletion(t *testing.T) {
	t.Setenv(unshare.DisableAutoRootless, "true")
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRoot
	})
	for _, action := range []string{"add", "delete"} {
		t.Run(action, func(t *testing.T) {
			name := "commit-" + action
			path := constants.Clusterfile(name)
			if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
				t.Fatal(err)
			}
			current := &v2.Cluster{
				TypeMeta:   metav1.TypeMeta{APIVersion: "sealos.io/v1beta1", Kind: "Cluster"},
				ObjectMeta: metav1.ObjectMeta{Name: name},
				Spec: v2.ClusterSpec{
					ControlPlaneMode: v2.ControlPlaneModeStandalone,
					Hosts:            []v2.Host{{IPS: []string{"127.0.0.1:22"}, Roles: []string{v2.MASTER}}},
				},
			}
			worker := v2.Host{IPS: []string{"192.0.2.2:22"}, Roles: []string{v2.NODE}}
			if action == "delete" {
				current.Spec.Hosts = append(current.Spec.Hosts, worker)
			}
			original, err := yaml.MarshalConfigs(current)
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(path, original, 0o600); err != nil {
				t.Fatal(err)
			}
			cf := clusterfile.NewClusterFile(path)
			if err := cf.Process(); err != nil {
				t.Fatal(err)
			}
			desired := current.DeepCopy()
			if action == "add" {
				desired.Spec.Hosts = append(desired.Spec.Hosts, worker)
			} else {
				desired.Spec.Hosts = desired.Spec.Hosts[:1]
			}
			applier := &Applier{
				Context:        context.Background(),
				ClusterFile:    cf,
				ClusterCurrent: current,
				ClusterDesired: desired,
			}
			operation := clusterfile.LifecycleOperation{Action: "apply", Request: action}
			failure := errors.New("commit interrupted after inventory synchronization")
			err = clusterfile.WithLifecycle(
				context.Background(), name, operation, false,
				func(context.Context) error {
					if err := applier.commitStandaloneInventory(); err != nil {
						return err
					}
					return failure
				},
			)
			if !errors.Is(err, failure) {
				t.Fatal(err)
			}
			assertWorkers := func(want int) {
				t.Helper()
				loaded := clusterfile.NewClusterFile(path)
				if err := loaded.Process(); err != nil {
					t.Fatal(err)
				}
				if got := len(loaded.GetCluster().GetNodeIPList()); got != want {
					t.Fatalf("loaded %d workers, want %d", got, want)
				}
			}
			assertWorkers(len(current.GetNodeIPList()))
			if err := clusterfile.WithLifecycle(
				context.Background(), name, operation, false,
				func(context.Context) error {
					return applier.commitStandaloneInventory()
				},
			); err != nil {
				t.Fatal(err)
			}
			assertWorkers(len(desired.GetNodeIPList()))
			marker := filepath.Join(filepath.Dir(path), clusterfile.LifecycleFilename)
			if _, err := os.Stat(marker); !os.IsNotExist(err) {
				t.Fatalf("completed lifecycle retained its local marker: %v", err)
			}
		})
	}
}

func TestLocalLifecycleHostAddresses(t *testing.T) {
	addresses := []net.Addr{
		&net.IPNet{IP: net.ParseIP("192.0.2.1"), Mask: net.CIDRMask(24, 32)},
		&net.IPNet{IP: net.ParseIP("2001:db8::1"), Mask: net.CIDRMask(64, 128)},
	}
	for _, host := range []string{
		"192.0.2.1:22",
		"[2001:db8::1]:22",
		"localhost:22",
		"127.0.0.2:22",
		"[::1]:22",
	} {
		if !isLocalLifecycleHost(host, addresses) {
			t.Fatalf("did not preserve local marker on %s", host)
		}
	}
	if isLocalLifecycleHost("192.0.2.2:22", addresses) {
		t.Fatal("classified a remote master as local")
	}
}
