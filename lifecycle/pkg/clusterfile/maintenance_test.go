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

package clusterfile

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/labring/sealos/pkg/types/v1beta1"
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
  routeController:
    image: registry.example/controller:old
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
		controller := &v1beta1.RouteControllerConfig{
			Image:      "registry.example/controller:new",
			Kubeconfig: "/etc/kubernetes/route-controller/kc",
			Config:     "/etc/kubernetes/route-controller/config.yaml",
			Table:      200,
			Protocol:   88,
		}
		if mode == "registered" {
			controller = nil
		}
		data, err = replaceControlPlaneMode(data, mode, controller)
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
		if mode == "standalone" {
			for _, value := range []string{
				"image: registry.example/controller:new",
				"kubeconfig: /etc/kubernetes/route-controller/kc",
				"config: /etc/kubernetes/route-controller/config.yaml",
				"table: 200",
				"protocol: 88",
			} {
				if !strings.Contains(string(data), value) {
					t.Fatalf("controller commit lost %q: %s", value, data)
				}
			}
		} else {
			// A nil controller must leave the committed settings alone.
			for _, value := range []string{
				"image: registry.example/controller:new",
				"kubeconfig: /etc/kubernetes/route-controller/kc",
				"table: 200",
			} {
				if !strings.Contains(string(data), value) {
					t.Fatalf("registered commit dropped %q: %s", value, data)
				}
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
	_, err = client.CoordinationV1().
		Leases("kube-system").
		Get(context.Background(), ModeTransitionResource, metav1.GetOptions{})
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
	client.PrependReactor(
		"get",
		"configmaps",
		func(clienttesting.Action) (bool, runtime.Object, error) {
			return true, nil, offline
		},
	)
	if err := checkOptionalModeTransition(context.Background(), client, false); err != nil {
		t.Fatalf("legacy offline reset was blocked: %v", err)
	}
	if err := checkOptionalModeTransition(
		context.Background(),
		client,
		true,
	); !errors.Is(
		err,
		offline,
	) {
		t.Fatalf("managed inventory bypassed API verification: %v", err)
	}
}
