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
)

// log is for logging in this package.
var nlog = logf.Log.WithName("namespace-resource")

//+kubebuilder:webhook:path=/mutate-core-v1-namespace,mutating=true,failurePolicy=ignore,sideEffects=None,groups=core,resources=ingresses,verbs=create;update,versions=v1,name=vnamespace.kb.io,admissionReviewVersions=v1

//+kubebuilder:object:generate=false

type NamespaceMutator struct {
	client.Client
}

func (m *NamespaceMutator) Default(ctx context.Context, obj runtime.Object) error {
	return nil
}

//+kubebuilder:object:generate=false

type NamespaceValidator struct {
	client.Client
}

//+kubebuilder:webhook:path=/validate-core-v1-namespace,mutating=false,failurePolicy=ignore,sideEffects=None,groups=core,resources=namespaces,verbs=create;update,versions=v1,name=vnamespace.kb.io,admissionReviewVersions=v1

func (v *NamespaceValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert Namespace is error")
	}
	nlog.Info("validating create", "name", i.Name)
	nlog.Info("enter checkOption func", "name", i.Name)
	return v.checkOption(ctx, i)
}

func (v *NamespaceValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {
	ni, ok := newObj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert Namespace is error")
	}
	oi, ok := oldObj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert Namespace is error")
	}
	nlog.Info("validating update", "name", oi.Name)
	nlog.Info("enter checkOption func", "name", ni.Name)
	return v.checkOption(ctx, ni)
}

func (v *NamespaceValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*corev1.Namespace)
	if !ok {
		return errors.New("obj convert Namespace is error")
	}
	nlog.Info("validating delete", "name", i.Name)
	nlog.Info("enter checkOption func", "name", i.Name)
	return v.checkOption(ctx, i)
}

func (v *NamespaceValidator) checkOption(ctx interface{}, i *corev1.Namespace) error {
	return nil
}
