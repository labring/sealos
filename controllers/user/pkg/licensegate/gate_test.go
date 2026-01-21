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
	"encoding/base64"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licensepkg "github.com/labring/sealos/controllers/pkg/license"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func newTestLicense(
	t *testing.T,
	userCount int,
	phase licensev1.LicenseStatusPhase,
	activationTime time.Time,
) *licensev1.License {
	t.Helper()
	decodeKey, err := base64.StdEncoding.DecodeString(licensepkg.GetEncryptionKey())
	if err != nil {
		t.Fatalf("decode encryption key failed: %v", err)
	}
	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(decodeKey)
	if err != nil {
		t.Fatalf("parse private key failed: %v", err)
	}
	claims := &licensepkg.Claims{
		Type: licensev1.ClusterLicenseType,
		Data: licensepkg.ClaimData{
			"userCount": userCount,
		},
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signed, err := token.SignedString(privateKey)
	if err != nil {
		t.Fatalf("sign token failed: %v", err)
	}
	return &licensev1.License{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-license",
		},
		Spec: licensev1.LicenseSpec{
			Token: signed,
			Type:  claims.Type,
		},
		Status: licensev1.LicenseStatus{
			Phase:          phase,
			ActivationTime: metav1.NewTime(activationTime),
		},
	}
}

func TestRefreshActiveLicense(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := licensev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add scheme failed: %v", err)
	}
	activeLicense := newTestLicense(t, 10, licensev1.LicenseStatusPhaseActive, time.Now())
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(activeLicense).Build()
	if err := Refresh(context.Background(), client); err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if !HasActiveLicense() {
		t.Fatalf("expected active license")
	}
	if UserLimit() != 10 {
		t.Fatalf("expected user limit 10, got %d", UserLimit())
	}
}

func TestRefreshNoActiveLicense(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := licensev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add scheme failed: %v", err)
	}
	inactiveLicense := newTestLicense(t, 10, licensev1.LicenseStatusPhaseFailed, time.Now())
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(inactiveLicense).Build()
	if err := Refresh(context.Background(), client); err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if HasActiveLicense() {
		t.Fatalf("expected inactive license")
	}
	if UserLimit() != DefaultUserLimit {
		t.Fatalf("expected default user limit %d, got %d", DefaultUserLimit, UserLimit())
	}
}

func TestAllowNewUserUnlimited(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := licensev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add scheme failed: %v", err)
	}
	activeLicense := newTestLicense(t, -1, licensev1.LicenseStatusPhaseActive, time.Now())
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(activeLicense).Build()
	if err := Refresh(context.Background(), client); err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if !AllowNewUser(1000) {
		t.Fatalf("expected unlimited user allow")
	}
}

func TestRefreshUsesLatestActiveLicense(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := licensev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add scheme failed: %v", err)
	}
	older := newTestLicense(t, 5, licensev1.LicenseStatusPhaseActive, time.Now().Add(-time.Hour))
	newer := newTestLicense(t, 20, licensev1.LicenseStatusPhaseActive, time.Now())
	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(older, newer).Build()
	if err := Refresh(context.Background(), client); err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if UserLimit() != 20 {
		t.Fatalf("expected user limit 20, got %d", UserLimit())
	}
}
