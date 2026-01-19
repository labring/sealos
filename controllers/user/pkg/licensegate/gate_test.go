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

package licensegate

import (
	"context"
	"testing"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestRefreshActiveLicense(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := licensev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add scheme failed: %v", err)
	}
	activeLicense := &licensev1.License{
		ObjectMeta: metav1.ObjectMeta{
			Name: "active-license",
		},
		Status: licensev1.LicenseStatus{
			Phase: licensev1.LicenseStatusPhaseActive,
		},
	}
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(activeLicense).Build()
	if err := Refresh(context.Background(), client); err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if !HasActiveLicense() {
		t.Fatalf("expected active license")
	}
}

func TestRefreshNoActiveLicense(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := licensev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add scheme failed: %v", err)
	}
	inactiveLicense := &licensev1.License{
		ObjectMeta: metav1.ObjectMeta{
			Name: "inactive-license",
		},
		Status: licensev1.LicenseStatus{
			Phase: licensev1.LicenseStatusPhaseFailed,
		},
	}
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(inactiveLicense).Build()
	if err := Refresh(context.Background(), client); err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if HasActiveLicense() {
		t.Fatalf("expected inactive license")
	}
}
