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
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type rejectingCacheReader struct {
	used bool
}

func (r *rejectingCacheReader) Get(
	context.Context,
	client.ObjectKey,
	client.Object,
	...client.GetOption,
) error {
	r.used = true
	return errors.New("unexpected cache get")
}

func (r *rejectingCacheReader) List(
	context.Context,
	client.ObjectList,
	...client.ListOption,
) error {
	r.used = true
	return errors.New("unexpected cache list")
}

func TestOptionsRegistersProjectedInformers(t *testing.T) {
	options := Options()
	if !options.ReaderFailOnMissingInformer {
		t.Fatal("missing informer reads are allowed")
	}
	if options.DefaultTransform == nil {
		t.Fatal("default managed fields transform is nil")
	}

	required := []client.Object{&licensev1.License{}, &corev1.Node{}}
	if len(options.ByObject) != len(required) {
		t.Fatalf("cache object count = %d, want %d", len(options.ByObject), len(required))
	}
	for _, expected := range required {
		found := false
		for object, byObject := range options.ByObject {
			if reflect.TypeOf(object) != reflect.TypeOf(expected) {
				continue
			}
			found = true
			if byObject.Transform == nil {
				t.Fatalf("%T transform is nil", expected)
			}
		}
		if !found {
			t.Fatalf("%T cache options not found", expected)
		}
	}
}

func TestUncachedObjectsKeepsCompleteAndLowFrequencyReadsDirect(t *testing.T) {
	required := []client.Object{
		&licensev1.License{},
		&corev1.Namespace{},
		&notificationv1.Notification{},
		&userv1.User{},
	}
	disabled := UncachedObjects()
	if len(disabled) != len(required) {
		t.Fatalf("uncached object count = %d, want %d", len(disabled), len(required))
	}
	for _, expected := range required {
		found := false
		for _, object := range disabled {
			if reflect.TypeOf(object) == reflect.TypeOf(expected) {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("%T is not configured to bypass the cache", expected)
		}
	}
}

func TestUserMetadataListBypassesCache(t *testing.T) {
	apiCalled := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		apiCalled = true
		if req.URL.Path != "/apis/user.sealos.io/v1/users" {
			t.Errorf("request path = %q, want User collection", req.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{
			"apiVersion":"user.sealos.io/v1",
			"kind":"UserList",
			"metadata":{"resourceVersion":"1"},
			"items":[{"apiVersion":"user.sealos.io/v1","kind":"User","metadata":{"name":"user-a"}}]
		}`)
	}))
	defer server.Close()

	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("register User scheme: %v", err)
	}
	mapper := meta.NewDefaultRESTMapper([]schema.GroupVersion{userv1.GroupVersion})
	mapper.Add(userv1.GroupVersion.WithKind("User"), meta.RESTScopeRoot)
	cacheReader := &rejectingCacheReader{}
	apiClient, err := client.New(&rest.Config{Host: server.URL}, client.Options{
		Scheme: scheme,
		Mapper: mapper,
		Cache: &client.CacheOptions{
			Reader:     cacheReader,
			DisableFor: []client.Object{&userv1.User{}},
		},
	})
	if err != nil {
		t.Fatalf("create client: %v", err)
	}

	list := &metav1.PartialObjectMetadataList{}
	list.SetGroupVersionKind(userv1.GroupVersion.WithKind("UserList"))
	if err := apiClient.List(context.Background(), list); err != nil {
		t.Fatalf("list User metadata: %v", err)
	}
	if !apiCalled || cacheReader.used {
		t.Fatalf("routing: api called = %t, cache used = %t", apiCalled, cacheReader.used)
	}
	if len(list.Items) != 1 || list.Items[0].Name != "user-a" {
		t.Fatalf("User metadata list = %#v", list.Items)
	}
}

func TestTransformLicenseKeepsOnlyEventMetadata(t *testing.T) {
	deletionTimestamp := metav1.Now()
	license := &licensev1.License{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "default",
			Namespace:         "ns-admin",
			ResourceVersion:   "42",
			Generation:        3,
			DeletionTimestamp: &deletionTimestamp,
			Finalizers:        []string{"license.sealos.io/finalizer"},
			Labels:            map[string]string{"unused": "large-value"},
			Annotations:       map[string]string{"unused": "large-value"},
			ManagedFields:     []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: licensev1.LicenseSpec{Token: "large-license-token"},
		Status: licensev1.LicenseStatus{
			Phase:  licensev1.LicenseStatusPhaseActive,
			Reason: "large-status-reason",
		},
	}

	transformed, err := transformLicense(license)
	if err != nil {
		t.Fatalf("transform license: %v", err)
	}
	got, ok := transformed.(*licensev1.License)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.License", transformed)
	}
	if got.Name != license.Name || got.Namespace != license.Namespace ||
		got.ResourceVersion != license.ResourceVersion || got.Generation != license.Generation ||
		got.DeletionTimestamp == nil || !got.DeletionTimestamp.Equal(license.DeletionTimestamp) {
		t.Fatalf("required event metadata was not retained: %#v", got.ObjectMeta)
	}
	if got.Spec.Token != "" || !reflect.DeepEqual(got.Status, licensev1.LicenseStatus{}) ||
		len(got.Finalizers) != 0 || len(got.Labels) != 0 || len(got.Annotations) != 0 ||
		len(got.ManagedFields) != 0 {
		t.Fatalf("unused license payload was retained: %#v", got)
	}
	if license.Spec.Token == "" || len(license.ManagedFields) == 0 {
		t.Fatal("transform mutated the source object")
	}
}

func TestTransformNodeKeepsOnlyValidationResources(t *testing.T) {
	node := &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name:          "node-a",
			Labels:        map[string]string{"unused": "large-value"},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: corev1.NodeSpec{ProviderID: "unused-provider-id"},
		Status: corev1.NodeStatus{
			Allocatable: corev1.ResourceList{
				corev1.ResourceCPU:              resource.MustParse("8"),
				corev1.ResourceMemory:           resource.MustParse("32Gi"),
				corev1.ResourceEphemeralStorage: resource.MustParse("100Gi"),
				corev1.ResourcePods:             resource.MustParse("110"),
			},
			Capacity: corev1.ResourceList{
				corev1.ResourceCPU: resource.MustParse("10"),
			},
			Conditions: []corev1.NodeCondition{{Type: corev1.NodeReady}},
			Images:     []corev1.ContainerImage{{Names: []string{"unused-image"}}},
		},
	}

	transformed, err := transformNode(node)
	if err != nil {
		t.Fatalf("transform node: %v", err)
	}
	got, ok := transformed.(*corev1.Node)
	if !ok {
		t.Fatalf("transformed type = %T, want *corev1.Node", transformed)
	}
	if got.Name != node.Name || got.Status.Allocatable.Cpu().String() != "8" ||
		got.Status.Allocatable.Memory().String() != "32Gi" {
		t.Fatalf("node validation fields were not retained: %#v", got)
	}
	if len(got.Status.Allocatable) != 2 || len(got.Status.Capacity) != 0 ||
		len(got.Status.Conditions) != 0 || len(got.Status.Images) != 0 ||
		got.Spec.ProviderID != "" || len(got.Labels) != 0 || len(got.ManagedFields) != 0 {
		t.Fatalf("unused node payload was retained: %#v", got)
	}
	if len(node.Status.Allocatable) != 4 || len(node.ManagedFields) == 0 {
		t.Fatal("transform mutated the source object")
	}
}
