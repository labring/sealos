/*
Copyright 2023.

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

package v1

import (
	"context"
	"errors"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var nlog = logf.Log.WithName("namespace-validating-webhook")

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:webhook:path=/mutate--v1-namespace,mutating=true,failurePolicy=ignore,sideEffects=None,groups=core,resources=namespaces,verbs=create;update,versions=v1,name=mnamespace.sealos.io,admissionReviewVersions=v1

//+kubebuilder:object:generate=false

type NamespaceMutator struct {
	client.Client
}

func (m *NamespaceMutator) Default(_ context.Context, obj runtime.Object) error {
	i, ok := obj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert to Namespace error")
	}
	nlog.Info("mutating create/update", "name", i.Name)
	initAnnotationAndLabels(&i.ObjectMeta)

	// add sealos.io/namespace annotation
	i.Annotations["sealos.io/namespace"] = i.Name
	return nil
}

//+kubebuilder:object:generate=false

type NamespaceValidator struct {
	client.Client
}

//+kubebuilder:webhook:path=/validate--v1-namespace,mutating=false,failurePolicy=ignore,sideEffects=None,groups=core,resources=namespaces,verbs=create;update;delete,versions=v1,name=vnamespace.sealos.io,admissionReviewVersions=v1

func (v *NamespaceValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert to Namespace error")
	}
	nlog.Info("validating create", "name", i.Name)
	return v.validate(ctx, i)
}

func (v *NamespaceValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {
	ni, ok := newObj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert to Namespace error")
	}
	oi, ok := oldObj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert to Namespace error")
	}
	nlog.Info("validating update", "name", oi.Name)
	return v.validate(ctx, ni)
}

func (v *NamespaceValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert to Namespace error")
	}
	nlog.Info("validating delete", "name", i.Name)
	return v.validate(ctx, i)
}

func (v *NamespaceValidator) validate(ctx context.Context, i *corev1.Namespace) error {
	request, _ := admission.RequestFromContext(ctx)
	nlog.Info("validating", "name", i.Name, "user", request.UserInfo.Username, "userGroups", request.UserInfo.Groups)
	if isUserServiceAccount(request.UserInfo.Username) {
		return errors.New("user can not create/update/delete namespace")
	}
	return nil
}
