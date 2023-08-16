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
	netv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// log is for logging in this package.
var ilog = logf.Log.WithName("ingress-resource")

//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete

//+kubebuilder:webhook:path=/mutate-networking-k8s-io-v1-ingress,mutating=true,failurePolicy=ignore,sideEffects=None,groups=networking.k8s.io,resources=ingresses,verbs=create;update,versions=v1,name=vingress.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type IngressMutator struct {
	client.Client
}

func (m *IngressMutator) Default(ctx context.Context, obj runtime.Object) error {
	return nil
}

//+kubebuilder:object:generate=false

type IngressValidator struct {
	client.Client
}

//+kubebuilder:webhook:path=/validate-networking-k8s-io-v1-ingress,mutating=false,failurePolicy=ignore,sideEffects=None,groups=networking.k8s.io,resources=ingresses,verbs=create;update,versions=v1,name=vingress.kb.io,admissionReviewVersions=v1

func (v *IngressValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}
	ilog.Info("validating create", "name", i.Name)
	ilog.Info("enter checkOption func", "name", i.Name)
	return v.checkOption(ctx, i)
}

func (v *IngressValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {

	ni, ok := newObj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}
	oi, ok := oldObj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}
	ilog.Info("validating update", "name", oi.Name)
	ilog.Info("enter checkOption func", "name", ni.Name)
	return v.checkOption(ctx, ni)
}

func (v *IngressValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}
	ilog.Info("validating delete", "name", i.Name)
	ilog.Info("enter checkOption func", "name", i.Name)
	return v.checkOption(ctx, i)
}

func (v *IngressValidator) checkOption(ctx context.Context, i *netv1.Ingress) error {
	return nil
}
