/*
Copyright 2022 labring.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Package v1 contains API Schema definitions for the user v1 API group
// +kubebuilder:object:generate=true
// +groupName=user.sealos.io
package v1

import (
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/scheme"
)

var (
	// GroupVersion is group version used to register these objects
	GroupVersion = schema.GroupVersion{Group: "user.sealos.io", Version: "v1"}

	// SchemeBuilder is used to add go types to the GroupVersionKind scheme
	SchemeBuilder = &scheme.Builder{GroupVersion: GroupVersion}

	// AddToScheme adds the types in this group-version to the given scheme.
	AddToScheme = SchemeBuilder.AddToScheme
)

const (
	UserAnnotationOwnerKey   = "user.sealos.io/creator"
	UserAnnotationDisplayKey = "user.sealos.io/display-name"
)

const (
	UgNameLabelKey        = "user.sealos.io/usergroup.name"
	UgRoleLabelKey        = "user.sealos.io/usergroup.role"
	UgBindingKindLabelKey = "user.sealos.io/usergroupbinding.kind"
	UgBindingNameLabelKey = "user.sealos.io/usergroupbinding.name"
)

func validateAnnotationKeyNotEmpty(meta metav1.ObjectMeta, key string) error {
	if meta.Annotations[key] == "" {
		return fmt.Errorf("annotation %s not allow empty", key)
	}
	return nil
}

func validateLabelKeyNotEmpty(meta metav1.ObjectMeta, key string) error {
	if meta.Labels[key] == "" {
		return fmt.Errorf("label %s not allow empty", key)
	}
	return nil
}

func initAnnotationAndLabels(meta metav1.ObjectMeta) metav1.ObjectMeta {
	if meta.Annotations == nil {
		meta.Annotations = make(map[string]string, 0)
	}
	if meta.Labels == nil {
		meta.Labels = make(map[string]string, 0)
	}
	return meta
}
