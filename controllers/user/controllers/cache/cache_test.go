// Copyright 2026 labring.
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

package cache

import (
	"reflect"
	"testing"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func TestOptionsLimitsSecretCache(t *testing.T) {
	syncPeriod := time.Hour
	options := Options(&syncPeriod)
	if options.SyncPeriod != &syncPeriod {
		t.Fatal("sync period was not retained")
	}
	if !options.ReaderFailOnMissingInformer {
		t.Fatal("missing informer reads are allowed")
	}
	if options.DefaultTransform == nil {
		t.Fatal("default managed fields transform is nil")
	}

	found := false
	for obj, byObject := range options.ByObject {
		if _, ok := obj.(*corev1.Secret); !ok {
			continue
		}
		found = true
		if byObject.Transform == nil {
			t.Fatal("secret transform is nil")
		}
		if len(byObject.Namespaces) != 1 {
			t.Fatalf("secret cache namespaces = %d, want 1", len(byObject.Namespaces))
		}
		if _, ok := byObject.Namespaces[config.GetUserSystemNamespace()]; !ok {
			t.Fatal("user system namespace is not cached for secrets")
		}
	}
	if !found {
		t.Fatal("secret cache options not found")
	}
}

func TestOptionsLimitNamespacedMetadataCaches(t *testing.T) {
	options := Options(nil)
	for _, required := range []client.Object{
		&corev1.ServiceAccount{},
		&userv1.Operationrequest{},
	} {
		found := false
		for obj, byObject := range options.ByObject {
			if reflect.TypeOf(obj) != reflect.TypeOf(required) {
				continue
			}
			found = true
			if len(byObject.Namespaces) != 1 {
				t.Fatalf("%T cache namespaces = %d, want 1", required, len(byObject.Namespaces))
			}
			if _, ok := byObject.Namespaces[config.GetUserSystemNamespace()]; !ok {
				t.Fatalf("%T cache is not limited to the user system namespace", required)
			}
		}
		if !found {
			t.Fatalf("%T cache options not found", required)
		}
	}
}

func TestTransformSecretKeepsOnlyIndexMetadata(t *testing.T) {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "token-a",
			Namespace:       config.GetUserSystemNamespace(),
			ResourceVersion: "42",
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: "user-a",
				"unused.example/key":         "large-value",
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Type: corev1.SecretTypeServiceAccountToken,
		Data: map[string][]byte{"token": []byte("sensitive-data")},
	}

	transformed, err := transformSecret(secret)
	if err != nil {
		t.Fatalf("transform secret: %v", err)
	}
	got, ok := transformed.(*corev1.Secret)
	if !ok {
		t.Fatalf("transformed type = %T, want *corev1.Secret", transformed)
	}
	if got.Name != secret.Name || got.Namespace != secret.Namespace || got.ResourceVersion != "42" {
		t.Fatalf("required metadata was not retained: %#v", got.ObjectMeta)
	}
	if got.Annotations[corev1.ServiceAccountNameKey] != "user-a" || len(got.Annotations) != 1 {
		t.Fatalf("secret index annotations = %#v", got.Annotations)
	}
	if got.Type != "" || len(got.Data) != 0 || len(got.ManagedFields) != 0 {
		t.Fatalf("secret payload was retained: %#v", got)
	}
}

func TestTransformUserDropsOnlyLargeUnusedFields(t *testing.T) {
	rotateAt := metav1.Now()
	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "user-a",
			ResourceVersion: "42",
			Annotations: map[string]string{
				userv1.UserAnnotationOwnerKey: "owner-a",
				"unused.example/annotation":   "unused",
			},
			Labels: map[string]string{
				"user.sealos.io/status": "active",
				"user.sealos.io/type":   "Group",
				"unused.example/label":  "unused",
			},
			Finalizers:    []string{"sealos.io/user.finalizers"},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: userv1.UserSpec{
			CSRExpirationSeconds: 600,
			KubeConfigRotateAt:   &rotateAt,
		},
		Status: userv1.UserStatus{
			Phase:                        userv1.UserActive,
			KubeConfig:                   "large-kubeconfig",
			ObservedCSRExpirationSeconds: 600,
			ObservedKubeConfigRotateAt:   &rotateAt,
			ObservedGeneration:           7,
			Conditions: []userv1.Condition{{
				Type:   userv1.Ready,
				Status: corev1.ConditionTrue,
			}},
		},
	}

	transformed, err := transformUser(user)
	if err != nil {
		t.Fatalf("transform user: %v", err)
	}
	got, ok := transformed.(*userv1.User)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.User", transformed)
	}
	if got.Status.KubeConfig != "" {
		t.Fatal("kubeconfig was retained")
	}
	if len(got.ManagedFields) != 0 {
		t.Fatal("managed fields were retained")
	}
	wantAnnotations := map[string]string{userv1.UserAnnotationOwnerKey: "owner-a"}
	wantLabels := map[string]string{
		"user.sealos.io/status": "active",
		"user.sealos.io/type":   "Group",
	}
	if got.Name != user.Name || got.ResourceVersion != user.ResourceVersion ||
		!reflect.DeepEqual(got.Annotations, wantAnnotations) ||
		!reflect.DeepEqual(got.Labels, wantLabels) ||
		!reflect.DeepEqual(got.Finalizers, user.Finalizers) ||
		!reflect.DeepEqual(got.Spec, user.Spec) {
		t.Fatalf("required user fields were not retained: %#v", got)
	}
	wantStatus := user.Status.DeepCopy()
	wantStatus.KubeConfig = ""
	if !reflect.DeepEqual(&got.Status, wantStatus) {
		t.Fatalf("status = %#v, want %#v", got.Status, *wantStatus)
	}
	if user.Status.KubeConfig == "" || len(user.ManagedFields) == 0 {
		t.Fatal("transform mutated the source user")
	}
}

func TestTransformMetadataKeepsOnlyEventFields(t *testing.T) {
	metadata := &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "role-a",
			Namespace:       "ns-a",
			ResourceVersion: "42",
			Annotations:     map[string]string{"unused.example/key": "unused"},
			Labels:          map[string]string{"unused.example/key": "unused"},
			Finalizers:      []string{"unused.example/finalizer"},
			ManagedFields:   []metav1.ManagedFieldsEntry{{Manager: "test"}},
			OwnerReferences: []metav1.OwnerReference{{Name: "user-a"}},
		},
	}
	metadata.SetGroupVersionKind(corev1.SchemeGroupVersion.WithKind("ServiceAccount"))

	transformed, err := transformOwnerMetadata(metadata)
	if err != nil {
		t.Fatalf("transform metadata: %v", err)
	}
	got, ok := transformed.(*metav1.PartialObjectMetadata)
	if !ok {
		t.Fatalf("transformed type = %T, want *metav1.PartialObjectMetadata", transformed)
	}
	if got.GroupVersionKind() != metadata.GroupVersionKind() || got.Name != metadata.Name ||
		got.Namespace != metadata.Namespace || got.ResourceVersion != metadata.ResourceVersion {
		t.Fatalf("required event metadata was not retained: %#v", got)
	}
	if !reflect.DeepEqual(got.OwnerReferences, metadata.OwnerReferences) {
		t.Fatalf("owner references = %#v, want %#v", got.OwnerReferences, metadata.OwnerReferences)
	}
	if len(got.Annotations) != 0 || len(got.Labels) != 0 || len(got.Finalizers) != 0 ||
		len(got.ManagedFields) != 0 {
		t.Fatalf("unused metadata was retained: %#v", got.ObjectMeta)
	}

	keyOnly, err := transformKeyMetadata(metadata)
	if err != nil {
		t.Fatalf("transform key metadata: %v", err)
	}
	gotKey, ok := keyOnly.(*metav1.PartialObjectMetadata)
	if !ok {
		t.Fatalf("key metadata type = %T, want *metav1.PartialObjectMetadata", keyOnly)
	}
	if len(gotKey.OwnerReferences) != 0 {
		t.Fatalf("key-only owner references were retained: %#v", gotKey.OwnerReferences)
	}
}

func TestUncachedObjects(t *testing.T) {
	types := make(map[reflect.Type]struct{})
	for _, obj := range UncachedObjects() {
		types[reflect.TypeOf(obj)] = struct{}{}
	}
	for _, required := range []client.Object{
		&corev1.Namespace{},
		&corev1.Secret{},
		&corev1.ServiceAccount{},
	} {
		if _, ok := types[reflect.TypeOf(required)]; !ok {
			t.Fatalf("%T reads are still cache-backed", required)
		}
	}
	if _, ok := types[reflect.TypeFor[*userv1.User]()]; ok {
		t.Fatal("user reads bypass the projected cache")
	}
}
