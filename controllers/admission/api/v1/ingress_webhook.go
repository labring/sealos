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
	"net"
	"strings"

	netv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var ilog = logf.Log.WithName("ingress-validating-webhook")

//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete

//+kubebuilder:webhook:path=/mutate-networking-k8s-io-v1-ingress,mutating=true,failurePolicy=ignore,sideEffects=None,groups=networking.k8s.io,resources=ingresses,verbs=create;update,versions=v1,name=mingress.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type IngressMutator struct {
	client.Client
}

func (m *IngressMutator) Default(_ context.Context, _ runtime.Object) error {
	return nil
}

//+kubebuilder:object:generate=false

type IngressValidator struct {
	client.Client
	Domain string
}

//+kubebuilder:webhook:path=/validate-networking-k8s-io-v1-ingress,mutating=false,failurePolicy=ignore,sideEffects=None,groups=networking.k8s.io,resources=ingresses,verbs=create;update;delete,versions=v1,name=vingress.kb.io,admissionReviewVersions=v1

func (v *IngressValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}

	ilog.Info("validating create", "ingress namespace", i.Namespace, "ingress name", i.Name)
	return v.validate(ctx, i)
}

func (v *IngressValidator) ValidateUpdate(ctx context.Context, _, newObj runtime.Object) error {
	ni, ok := newObj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}
	//oi, ok := oldObj.(*netv1.Ingress)
	//if !ok {
	//	return errors.New("obj convert Ingress is error")
	//}
	ilog.Info("validating update", "ingress namespace", ni.Namespace, "ingress name", ni.Name)
	return v.validate(ctx, ni)
}

func (v *IngressValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}

	ilog.Info("validating delete", "ingress namespace", i.Namespace, "ingress name", i.Name)
	return v.validate(ctx, i)
}

func (v *IngressValidator) validate(ctx context.Context, i *netv1.Ingress) error {
	request, _ := admission.RequestFromContext(ctx)
	ilog.Info("validating", "ingress namespace", i.Namespace, "ingress name", i.Name, "user", request.UserInfo.Username, "userGroups", request.UserInfo.Groups)
	if !isUserServiceAccount(request.UserInfo.Username) {
		ilog.Info("user is not user's serviceaccount, skip validate")
		return nil
	}

	for _, rule := range i.Spec.Rules {
		// check if ingress host is end with domain
		if strings.HasSuffix(rule.Host, v.Domain) {
			ilog.Info("ingress host is end with "+v.Domain+", skip validate", "ingress namespace", i.Namespace, "ingress name", i.Name)
			continue
		}

		// get cname and check if it is cname to domain
		cname, err := net.LookupCNAME(rule.Host)
		if err != nil {
			ilog.Error(err, "can not verify ingress host "+rule.Host+", lookup cname error")
			return err
		}
		// remove last dot
		cname = strings.TrimSuffix(cname, ".")

		// if cname is not end with domain, return error
		if !strings.HasSuffix(cname, v.Domain) {
			ilog.Info("deny ingress host "+rule.Host+", cname is not end with "+v.Domain, "ingress namespace", i.Namespace, "ingress name", i.Name, "cname", cname)
			return errors.New("can not verify ingress host " + rule.Host + ", cname is not end with " + v.Domain)
		}
	}
	return nil
}
