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
	"net/http"
	"strings"

	admissionv1 "k8s.io/api/admission/v1"
	appsv1 "k8s.io/api/apps/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	CreatorUserCrNameAnnotation = "resource.sealos.io/creator-user-cr-name"
	CreatorTypeAnnotation       = "resource.sealos.io/creator-type"
	creatorAppLabel             = "cloud.sealos.io/app-deploy-manager"
)

var creatorKeys = []string{CreatorUserCrNameAnnotation, CreatorTypeAnnotation}

// ResourceCreator records the API server's authenticated actor, never a client-supplied identity.
// The validating instance checks the final object after all mutating webhooks have run.
// +kubebuilder:object:generate=false
type ResourceCreator struct {
	Reader        client.Reader
	UserNamespace string
	Validate      bool
}

func creatorTarget(obj *unstructured.Unstructured) bool {
	// Only business roots are targets; Pod templates are handled on app roots below.
	for _, owner := range obj.GetOwnerReferences() {
		if owner.Controller != nil && *owner.Controller {
			return false
		}
	}
	switch obj.GetAPIVersion() {
	case "apps.kubeblocks.io/v1alpha1", "apps.kubeblocks.io/v1":
		return obj.GetKind() == "Cluster"
	case "devbox.sealos.io/v1alpha2":
		return obj.GetKind() == "Devbox"
	case "objectstorage.sealos.io/v1":
		return obj.GetKind() == "ObjectStorageBucket"
	case "batch/v1":
		return obj.GetKind() == "CronJob"
	}
	if !creatorAppWorkload(obj) {
		return false
	}
	for _, key := range creatorKeys {
		if _, ok := obj.GetAnnotations()[key]; ok {
			return true
		}
	}
	return obj.GetLabels()[creatorAppLabel] != ""
}

func creatorAppWorkload(obj *unstructured.Unstructured) bool {
	return obj.GetAPIVersion() == "apps/v1" && (obj.GetKind() == "Deployment" || obj.GetKind() == "StatefulSet")
}

func sameCreator(a, b map[string]string) bool {
	for _, key := range creatorKeys {
		av, aOK := a[key]
		bv, bOK := b[key]
		if av != bv || aOK != bOK {
			return false
		}
	}
	return true
}

func copyCreator(dst, src map[string]string) {
	for _, key := range creatorKeys {
		delete(dst, key)
		if value, ok := src[key]; ok {
			dst[key] = value
		}
	}
}

func (h *ResourceCreator) Handle(ctx context.Context, req admission.Request) admission.Response {
	if req.SubResource != "" || !strings.HasPrefix(req.Namespace, "ns-") ||
		(req.Operation != admissionv1.Create && req.Operation != admissionv1.Update) {
		return admission.Allowed("")
	}
	obj := &unstructured.Unstructured{}
	if err := json.Unmarshal(req.Object.Raw, obj); err != nil {
		return admission.Errored(http.StatusBadRequest, err)
	}
	old := &unstructured.Unstructured{}
	if req.Operation == admissionv1.Update {
		if err := json.Unmarshal(req.OldObject.Raw, old); err != nil {
			return admission.Errored(http.StatusBadRequest, err)
		}
	}
	if !creatorTarget(obj) && !creatorTarget(old) {
		return admission.Allowed("")
	}
	annotations := obj.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	original := obj.GetAnnotations()
	if req.Operation == admissionv1.Update {
		// Also preserve absence on legacy resources: an edit is not a creation.
		copyCreator(annotations, old.GetAnnotations())
	} else {
		values, err := h.creationIdentity(ctx, req, obj)
		if err != nil {
			return admission.Errored(http.StatusServiceUnavailable, err)
		}
		copyCreator(annotations, values)
	}
	if h.Validate && !sameCreator(annotations, original) {
		return admission.Denied("resource creator annotations are managed by Sealos")
	}
	if creatorAppWorkload(obj) {
		templateAnnotations, _, err := unstructured.NestedStringMap(obj.Object, "spec", "template", "metadata", "annotations")
		if err != nil {
			return admission.Errored(http.StatusBadRequest, err)
		}
		if h.Validate && !sameCreator(annotations, templateAnnotations) {
			return admission.Denied("pod template creator annotations are managed by Sealos")
		}
		if !h.Validate {
			if templateAnnotations == nil {
				templateAnnotations = make(map[string]string)
			}
			copyCreator(templateAnnotations, annotations)
			if len(templateAnnotations) > 0 {
				if err := unstructured.SetNestedStringMap(obj.Object, templateAnnotations, "spec", "template", "metadata", "annotations"); err != nil {
					return admission.Errored(http.StatusBadRequest, err)
				}
			} else {
				unstructured.RemoveNestedField(obj.Object, "spec", "template", "metadata", "annotations")
			}
		}
	}
	if h.Validate {
		return admission.Allowed("")
	}
	obj.SetAnnotations(annotations)
	updated, err := json.Marshal(obj)
	if err != nil {
		return admission.Errored(http.StatusInternalServerError, err)
	}
	return admission.PatchResponseFromRaw(req.Object.Raw, updated)
}

func (h *ResourceCreator) creationIdentity(ctx context.Context, req admission.Request, obj *unstructured.Unstructured) (map[string]string, error) {
	// AppLaunchpad creates the other workload kind before deleting the old one during
	// Deployment <-> StatefulSet conversion. Read the live source, not request annotations.
	if obj.GetAPIVersion() == "apps/v1" && h.Reader != nil {
		var source client.Object = &appsv1.Deployment{}
		if obj.GetKind() == "Deployment" {
			source = &appsv1.StatefulSet{}
		}
		err := h.Reader.Get(ctx, types.NamespacedName{Namespace: req.Namespace, Name: obj.GetName()}, source)
		if err != nil && !apierrors.IsNotFound(err) {
			return nil, err
		}
		if err == nil && obj.GetLabels()[creatorAppLabel] != "" &&
			source.GetLabels()[creatorAppLabel] == obj.GetLabels()[creatorAppLabel] {
			return source.GetAnnotations(), nil
		}
	}
	username := req.UserInfo.Username
	values := map[string]string{CreatorTypeAnnotation: "unknown"}
	name := username
	if strings.HasPrefix(username, "system:serviceaccount:") {
		values[CreatorTypeAnnotation] = "service"
		prefix := "system:serviceaccount:" + h.UserNamespace + ":"
		if !strings.HasPrefix(username, prefix) {
			return values, nil
		}
		name = strings.TrimPrefix(username, prefix)
	} else if strings.HasPrefix(username, "system:") {
		return values, nil
	}
	// Record the authenticated principal without resolving any business identity.
	// The admin application maps this regional name to the desktop User.id.
	if name != "" {
		values[CreatorUserCrNameAnnotation] = name
		values[CreatorTypeAnnotation] = "user"
	}
	return values, nil
}
