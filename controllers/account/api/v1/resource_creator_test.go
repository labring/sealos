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

package v1

import (
	"context"
	"encoding/json"
	"testing"

	jsonpatch "github.com/evanphx/json-patch/v5"
	admissionv1 "k8s.io/api/admission/v1"
	appsv1 "k8s.io/api/apps/v1"
	authenticationv1 "k8s.io/api/authentication/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const creatorTestID = "alice"

func creatorObject(apiVersion, kind string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion(apiVersion)
	obj.SetKind(kind)
	obj.SetName("example")
	obj.SetNamespace("ns-team")
	obj.SetLabels(map[string]string{creatorAppLabel: "example"})
	return obj
}

func creatorRequest(t *testing.T, obj, old *unstructured.Unstructured, username string) admission.Request {
	t.Helper()
	raw, err := json.Marshal(obj)
	if err != nil {
		t.Fatal(err)
	}
	req := admission.Request{AdmissionRequest: admissionv1.AdmissionRequest{
		Operation: admissionv1.Create, Namespace: obj.GetNamespace(), Name: obj.GetName(),
		UserInfo: authenticationv1.UserInfo{Username: username}, Object: runtime.RawExtension{Raw: raw},
	}}
	if old != nil {
		req.Operation = admissionv1.Update
		req.OldObject.Raw, err = json.Marshal(old)
		if err != nil {
			t.Fatal(err)
		}
	}
	return req
}

func mutateCreator(t *testing.T, handler *ResourceCreator, req admission.Request) *unstructured.Unstructured {
	t.Helper()
	response := handler.Handle(context.Background(), req)
	if !response.Allowed {
		t.Fatalf("mutation rejected: %+v", response.Result)
	}
	raw := req.Object.Raw
	if len(response.Patches) > 0 {
		patchBytes, err := json.Marshal(response.Patches)
		if err != nil {
			t.Fatal(err)
		}
		patch, err := jsonpatch.DecodePatch(patchBytes)
		if err != nil {
			t.Fatal(err)
		}
		raw, err = patch.Apply(raw)
		if err != nil {
			t.Fatal(err)
		}
	}
	obj := &unstructured.Unstructured{}
	if err := json.Unmarshal(raw, obj); err != nil {
		t.Fatal(err)
	}
	validator := *handler
	validator.Validate = true
	req.Object.Raw = raw
	if response := validator.Handle(context.Background(), req); !response.Allowed {
		t.Fatalf("mutated object rejected: %+v", response.Result)
	}
	return obj
}

func creatorHandler() *ResourceCreator {
	return &ResourceCreator{UserNamespace: "user-system"}
}

func TestResourceCreatorAuthenticatedIdentity(t *testing.T) {
	for _, kind := range []string{"Deployment", "StatefulSet", "Cluster"} {
		t.Run(kind, func(t *testing.T) {
			version := "apps/v1"
			if kind == "Cluster" {
				version = "apps.kubeblocks.io/v1alpha1"
			}
			obj := creatorObject(version, kind)
			obj.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: "forged", "other": "keep"})
			req := creatorRequest(t, obj, nil, "system:serviceaccount:user-system:alice")
			got := mutateCreator(t, creatorHandler(), req).GetAnnotations()
			if got[CreatorUserCrNameAnnotation] != creatorTestID || got[CreatorTypeAnnotation] != "user" || got["other"] != "keep" {
				t.Fatalf("unexpected annotations: %v", got)
			}
			validator := creatorHandler()
			validator.Validate = true
			if validator.Handle(context.Background(), req).Allowed {
				t.Fatal("validator accepted forged identity")
			}
		})
	}
}

func TestResourceCreatorUpdatesPreserveIdentityAndLegacyAbsence(t *testing.T) {
	for _, legacy := range []bool{false, true} {
		old := creatorObject("apps/v1", "Deployment")
		if !legacy {
			old.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: creatorTestID, CreatorTypeAnnotation: "user"})
		}
		obj := old.DeepCopy()
		obj.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: "forged", "other": "new"})
		obj.SetLabels(nil) // Removing the app label must not bypass protection.
		h := creatorHandler()
		got := mutateCreator(t, h, creatorRequest(t, obj, old, "bob"))
		if got.GetAnnotations()[CreatorUserCrNameAnnotation] != old.GetAnnotations()[CreatorUserCrNameAnnotation] || got.GetAnnotations()["other"] != "new" {
			t.Fatalf("unexpected annotations: %v", got.GetAnnotations())
		}
		if !legacy {
			// A second update after removing the app label still cannot change the creator.
			next := got.DeepCopy()
			next.SetAnnotations(nil)
			preserved := mutateCreator(t, h, creatorRequest(t, next, got, "bob"))
			if preserved.GetAnnotations()[CreatorUserCrNameAnnotation] != creatorTestID {
				t.Fatal("creator lost after removing app label")
			}
		}
	}
}

func TestResourceCreatorServiceAndUnknown(t *testing.T) {
	for _, tc := range []struct{ subject, actor string }{
		{"system:serviceaccount:operator:alice", "service"},
		{"", "unknown"},
		{"system:anonymous", "unknown"},
	} {
		obj := creatorObject("apps.kubeblocks.io/v1", "Cluster")
		got := mutateCreator(t, creatorHandler(), creatorRequest(t, obj, nil, tc.subject)).GetAnnotations()
		if got[CreatorTypeAnnotation] != tc.actor || got[CreatorUserCrNameAnnotation] != "" {
			t.Fatalf("unexpected actor: %v", got)
		}
	}
}

func TestResourceCreatorWorkloadConversion(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := appsv1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	old := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{
		Name: "example", Namespace: "ns-team", Labels: map[string]string{creatorAppLabel: "example"},
		Annotations: map[string]string{CreatorUserCrNameAnnotation: creatorTestID, CreatorTypeAnnotation: "user"},
	}}
	h := creatorHandler()
	h.Reader = fake.NewClientBuilder().WithScheme(scheme).WithObjects(old).Build()
	obj := creatorObject("apps/v1", "StatefulSet")
	got := mutateCreator(t, h, creatorRequest(t, obj, nil, "bob"))
	if got.GetAnnotations()[CreatorUserCrNameAnnotation] != creatorTestID {
		t.Fatal("conversion lost original creator")
	}
	// With the old resource gone, the same name is a new lifecycle.
	h.Reader = fake.NewClientBuilder().WithScheme(scheme).Build()
	got = mutateCreator(t, h, creatorRequest(t, obj, nil, "bob"))
	if got.GetAnnotations()[CreatorUserCrNameAnnotation] != "bob" {
		t.Fatal("recreation did not record the new creator")
	}
}

func TestResourceCreatorSkipsDerivedAndSystemResources(t *testing.T) {
	h := creatorHandler()
	obj := creatorObject("apps/v1", "StatefulSet")
	controller := true
	obj.SetOwnerReferences([]metav1.OwnerReference{{APIVersion: "apps.kubeblocks.io/v1alpha1", Kind: "Cluster", Name: "db", Controller: &controller}})
	got := mutateCreator(t, h, creatorRequest(t, obj, nil, "alice"))
	if len(got.GetAnnotations()) != 0 {
		t.Fatal("recorded operator child")
	}
	obj.SetOwnerReferences(nil)
	obj.SetNamespace("kube-system")
	got = mutateCreator(t, h, creatorRequest(t, obj, nil, "alice"))
	if len(got.GetAnnotations()) != 0 {
		t.Fatal("recorded system workload")
	}
}

func TestResourceCreatorWithoutDatabase(t *testing.T) {
	for _, subject := range []string{"alice", "system:serviceaccount:user-system:alice"} {
		obj := creatorObject("apps.kubeblocks.io/v1", "Cluster")
		// Both mutation and validation work with only the authenticated request.
		got := mutateCreator(t, creatorHandler(), creatorRequest(t, obj, nil, subject))
		if got.GetAnnotations()[CreatorUserCrNameAnnotation] != "alice" {
			t.Fatalf("unexpected identity: %v", got.GetAnnotations())
		}
	}
}

func TestResourceCreatorValidatorRejectsUpdateTampering(t *testing.T) {
	old := creatorObject("apps/v1", "Deployment")
	old.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: creatorTestID, CreatorTypeAnnotation: "user"})
	for _, annotations := range []map[string]string{
		nil,
		{CreatorUserCrNameAnnotation: "bob", CreatorTypeAnnotation: "user"},
		{CreatorUserCrNameAnnotation: creatorTestID, CreatorTypeAnnotation: "service"},
	} {
		obj := old.DeepCopy()
		obj.SetAnnotations(annotations)
		h := creatorHandler()
		h.Validate = true
		if h.Handle(context.Background(), creatorRequest(t, obj, old, "bob")).Allowed {
			t.Fatalf("accepted changed creator: %v", annotations)
		}
	}
}

func TestResourceCreatorDerivedWorkloadWithCopiedAnnotations(t *testing.T) {
	obj := creatorObject("apps/v1", "StatefulSet")
	controller := true
	obj.SetOwnerReferences([]metav1.OwnerReference{{APIVersion: "apps.kubeblocks.io/v1", Kind: "Cluster", Name: "db", Controller: &controller}})
	obj.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: "original", CreatorTypeAnnotation: "user"})
	response := creatorHandler().Handle(context.Background(), creatorRequest(t, obj, nil, "system:serviceaccount:operator:db"))
	if !response.Allowed || len(response.Patches) != 0 {
		t.Fatalf("processed derived workload: %+v", response)
	}
}

func TestResourceCreatorReverseConversionPreservesLegacyAbsence(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := appsv1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	for _, legacy := range []bool{false, true} {
		old := &appsv1.StatefulSet{ObjectMeta: metav1.ObjectMeta{
			Name: "example", Namespace: "ns-team", Labels: map[string]string{creatorAppLabel: "example"},
		}}
		if !legacy {
			old.Annotations = map[string]string{CreatorUserCrNameAnnotation: creatorTestID, CreatorTypeAnnotation: "user"}
		}
		h := creatorHandler()
		h.Reader = fake.NewClientBuilder().WithScheme(scheme).WithObjects(old).Build()
		obj := creatorObject("apps/v1", "Deployment")
		obj.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: "forged", CreatorTypeAnnotation: "user"})
		got := mutateCreator(t, h, creatorRequest(t, obj, nil, "bob"))
		for _, key := range creatorKeys {
			value, exists := got.GetAnnotations()[key]
			want, recorded := old.Annotations[key]
			if value != want || exists != recorded {
				t.Fatalf("conversion changed creator: %v", got.GetAnnotations())
			}
		}
	}
}

func TestResourceCreatorAppPodTemplate(t *testing.T) {
	for _, kind := range []string{"Deployment", "StatefulSet"} {
		t.Run(kind, func(t *testing.T) {
			obj := creatorObject("apps/v1", kind)
			setTemplate := func(obj *unstructured.Unstructured, a map[string]string) {
				t.Helper()
				if err := unstructured.SetNestedStringMap(obj.Object, a, "spec", "template", "metadata", "annotations"); err != nil {
					t.Fatal(err)
				}
			}
			setTemplate(obj, map[string]string{CreatorUserCrNameAnnotation: "forged", CreatorTypeAnnotation: "service", "other": "keep"})
			got := mutateCreator(t, creatorHandler(), creatorRequest(t, obj, nil, "alice"))
			a, _, _ := unstructured.NestedStringMap(got.Object, "spec", "template", "metadata", "annotations")
			if !sameCreator(a, got.GetAnnotations()) || a[CreatorUserCrNameAnnotation] != "alice" || a["other"] != "keep" {
				t.Fatalf("unexpected template annotations: %v", a)
			}
			for _, tampered := range []map[string]string{
				{"other": "keep"},
				{CreatorUserCrNameAnnotation: "bob", CreatorTypeAnnotation: "user", "other": "keep"},
			} {
				update := got.DeepCopy()
				setTemplate(update, tampered)
				req := creatorRequest(t, update, got, "bob")
				validator := creatorHandler()
				validator.Validate = true
				if validator.Handle(context.Background(), req).Allowed {
					t.Fatal("validator accepted template tampering")
				}
				fixed := mutateCreator(t, creatorHandler(), req)
				a, _, _ := unstructured.NestedStringMap(fixed.Object, "spec", "template", "metadata", "annotations")
				if !sameCreator(a, got.GetAnnotations()) || a["other"] != "keep" {
					t.Fatalf("update lost template identity: %v", a)
				}
			}
			// Existing root identity can be copied to the template; legacy absence cannot.
			for _, recorded := range []bool{false, true} {
				old := creatorObject("apps/v1", kind)
				if recorded {
					old.SetAnnotations(map[string]string{CreatorUserCrNameAnnotation: "original", CreatorTypeAnnotation: "user"})
				}
				update := old.DeepCopy()
				setTemplate(update, map[string]string{CreatorUserCrNameAnnotation: "forged", "other": "keep"})
				fixed := mutateCreator(t, creatorHandler(), creatorRequest(t, update, old, "bob"))
				a, _, _ := unstructured.NestedStringMap(fixed.Object, "spec", "template", "metadata", "annotations")
				if !sameCreator(a, old.GetAnnotations()) || a["other"] != "keep" {
					t.Fatalf("invalid historical template identity: %v", a)
				}
			}
		})
	}
}

func TestResourceCreatorOtherBusinessRoots(t *testing.T) {
	for _, tc := range []struct{ version, kind string }{
		{"apps.kubeblocks.io/v1", "Cluster"},
		{"apps.kubeblocks.io/v1alpha1", "Cluster"},
		{"devbox.sealos.io/v1alpha2", "Devbox"},
		{"objectstorage.sealos.io/v1", "ObjectStorageBucket"},
		{"batch/v1", "CronJob"},
	} {
		t.Run(tc.version+tc.kind, func(t *testing.T) {
			obj := creatorObject(tc.version, tc.kind)
			obj.Object["spec"] = map[string]interface{}{"template": map[string]interface{}{"metadata": map[string]interface{}{"annotations": map[string]interface{}{"other": "keep"}}}}
			before, _ := json.Marshal(obj.Object["spec"])
			got := mutateCreator(t, creatorHandler(), creatorRequest(t, obj, nil, "alice"))
			after, _ := json.Marshal(got.Object["spec"])
			if string(before) != string(after) || got.GetAnnotations()[CreatorUserCrNameAnnotation] != "alice" {
				t.Fatalf("expected root-only identity: %v", got.Object)
			}
			update := got.DeepCopy()
			update.SetAnnotations(nil)
			fixed := mutateCreator(t, creatorHandler(), creatorRequest(t, update, got, "bob"))
			if !sameCreator(fixed.GetAnnotations(), got.GetAnnotations()) {
				t.Fatal("root identity changed")
			}
		})
	}
}

func TestResourceCreatorSkipsAuxiliaryKinds(t *testing.T) {
	for _, tc := range []struct{ version, kind string }{
		{"v1", "Pod"}, {"v1", "Service"}, {"v1", "Secret"},
		{"v1", "ConfigMap"}, {"v1", "PersistentVolumeClaim"},
		{"networking.k8s.io/v1", "Ingress"}, {"apps/v1", "ReplicaSet"},
		{"batch/v1", "Job"}, {"objectstorage.sealos.io/v1", "ObjectStorageUser"},
	} {
		obj := creatorObject(tc.version, tc.kind)
		response := creatorHandler().Handle(context.Background(), creatorRequest(t, obj, nil, "alice"))
		if !response.Allowed || len(response.Patches) > 0 {
			t.Fatalf("unexpected auxiliary mutation for %s: %+v", tc.kind, response)
		}
	}
}
