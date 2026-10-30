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

package applydrivers

import (
	"strings"
	"testing"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func standaloneTestCluster(hosts ...string) *v2.Cluster {
	cluster := &v2.Cluster{
		TypeMeta:   metav1.TypeMeta{APIVersion: "sealos.io/v1beta1", Kind: "Cluster"},
		ObjectMeta: metav1.ObjectMeta{Name: "standalone-test"},
		Spec:       v2.ClusterSpec{ControlPlaneMode: v2.ControlPlaneModeStandalone},
	}
	for index, host := range hosts {
		role := v2.NODE
		if index == 0 {
			role = v2.MASTER
		}
		cluster.Spec.Hosts = append(
			cluster.Spec.Hosts,
			v2.Host{IPS: []string{host}, Roles: []string{role}},
		)
	}
	return cluster
}

func TestValidateImageReferences(t *testing.T) {
	if err := validateImageReferences(nil); err != nil {
		t.Fatalf("empty request rejected: %v", err)
	}
	valid := []string{
		"docker.io/labring/kubernetes:v1.33.6",
		"ghcr.io/zijiren233/gvisor:release-20261026.0-amd64",
		"busybox:1",
	}
	if err := validateImageReferences(valid); err != nil {
		t.Fatalf("valid references rejected: %v", err)
	}
	// sealos run -f /path/to/Clusterfile turns the path into an image name.
	invalid := []string{"/root/.sealos/default/Clusterfile"}
	err := validateImageReferences(invalid)
	if err == nil || !strings.Contains(err.Error(), "invalid image reference") {
		t.Fatalf("file path accepted as image reference: %v", err)
	}
}

func TestStandaloneMembershipDecision(t *testing.T) {
	master, worker := "192.0.2.1:22", "192.0.2.2:22"
	created := standaloneTestCluster(master, worker)
	created.CreationTimestamp = metav1.Now()

	same := standaloneTestCluster(master, worker)
	same.CreationTimestamp = metav1.Now()
	addedWorker := standaloneTestCluster(master, worker, "192.0.2.3:22")
	addedWorker.CreationTimestamp = metav1.Now()
	addedMaster := standaloneTestCluster(master, "192.0.2.9:22", worker)
	addedMaster.CreationTimestamp = metav1.Now()
	removedWorker := standaloneTestCluster(master)
	removedWorker.CreationTimestamp = metav1.Now()

	cases := []struct {
		name    string
		current *v2.Cluster
		desired *v2.Cluster
		want    bool
	}{
		{"unchanged inventory", created, same, false},
		{"added worker", created, addedWorker, true},
		{"added master", created, addedMaster, true},
		{"removed worker", created, removedWorker, true},
		{"day-zero", nil, same, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			applier := &Applier{ClusterCurrent: tc.current, ClusterDesired: tc.desired}
			if got := applier.standaloneMembership(); got != tc.want {
				t.Fatalf("membership = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestValidateStandaloneRequestGuards(t *testing.T) {
	master, worker := "192.0.2.1:22", "192.0.2.2:22"
	current := standaloneTestCluster(master, worker)
	current.CreationTimestamp = metav1.Now()

	appOnly := standaloneTestCluster(master, worker)
	appOnly.CreationTimestamp = metav1.Now()
	applier := &Applier{ClusterCurrent: current, ClusterDesired: appOnly}
	if err := applier.validateStandaloneRequest(); err != nil {
		t.Fatalf("app-only request rejected: %v", err)
	}

	// Mixing addition and removal must stay a hard error.
	mixed := standaloneTestCluster(master, "192.0.2.9:22")
	mixed.CreationTimestamp = metav1.Now()
	applier = &Applier{ClusterCurrent: current, ClusterDesired: mixed}
	if err := applier.validateStandaloneRequest(); err == nil {
		t.Fatal("mixed addition and removal accepted")
	}

	// A registered cluster must not be operated through the standalone path.
	registered := standaloneTestCluster(master, worker)
	registered.Spec.ControlPlaneMode = v2.ControlPlaneModeRegistered
	registered.CreationTimestamp = metav1.Now()
	applier = &Applier{ClusterCurrent: registered, ClusterDesired: appOnly}
	if err := applier.validateStandaloneRequest(); err == nil {
		t.Fatal("registered cluster accepted as standalone")
	}

	// Necessarily failing image references are rejected up front.
	applier = &Applier{
		ClusterCurrent: current,
		ClusterDesired: appOnly,
		RunNewImages:   []string{"/root/.sealos/default/Clusterfile"},
	}
	if err := applier.validateStandaloneRequest(); err == nil {
		t.Fatal("invalid image reference accepted")
	}

	// master0 must survive every entry point, including apply -f. The diff
	// removes only master0, so the mixed-change guard does not fire first.
	multiMaster := standaloneTestCluster("192.0.2.1:22", worker)
	multiMaster.CreationTimestamp = metav1.Now()
	multiMaster.Spec.Hosts = append(
		multiMaster.Spec.Hosts,
		v2.Host{IPS: []string{"192.0.2.3:22"}, Roles: []string{v2.MASTER}},
	)
	withoutMaster0 := standaloneTestCluster("192.0.2.3:22", worker)
	withoutMaster0.CreationTimestamp = metav1.Now()
	applier = &Applier{ClusterCurrent: multiMaster, ClusterDesired: withoutMaster0}
	if err := applier.validateStandaloneRequest(); err == nil {
		t.Fatal("master0 removal accepted")
	}
}
