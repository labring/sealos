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
	"fmt"
	"github.com/labring/sealos/controllers/pkg/code"
	"net"
	"os"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"strings"

	netv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var ilog = logf.Log.WithName("ingress-validating-webhook")

//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete

//+kubebuilder:webhook:path=/mutate-networking-k8s-io-v1-ingress,mutating=true,failurePolicy=ignore,sideEffects=None,groups=networking.k8s.io,resources=ingresses,verbs=create;update,versions=v1,name=mingress.sealos.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type IngressMutator struct {
	client.Client
}

func (m *IngressMutator) SetupWithManager(mgr ctrl.Manager) error {
	return builder.WebhookManagedBy(mgr).
		For(&netv1.Ingress{}).
		WithDefaulter(&IngressMutator{Client: mgr.GetClient()}).
		Complete()
}

func (m *IngressMutator) Default(_ context.Context, _ runtime.Object) error {
	return nil
}

//+kubebuilder:object:generate=false

type IngressValidator struct {
	client.Client
	domain string
	cache  cache.Cache
}

const IngressHostIndex = "host"

func (v *IngressValidator) SetupWithManager(mgr ctrl.Manager) error {
	ilog.Info("starting webhook cache map")
	iv := IngressValidator{Client: mgr.GetClient(), domain: os.Getenv("DOMAIN"), cache: mgr.GetCache()}

	err := iv.cache.IndexField(
		context.Background(),
		&netv1.Ingress{},
		IngressHostIndex,
		func(obj client.Object) []string {
			ingress := obj.(*netv1.Ingress)
			var hosts []string
			for _, rule := range ingress.Spec.Rules {
				hosts = append(hosts, rule.Host)
			}
			return hosts
		},
	)
	if err != nil {
		return err
	}

	return builder.WebhookManagedBy(mgr).
		For(&netv1.Ingress{}).
		WithValidator(&iv).
		Complete()
}

//+kubebuilder:webhook:path=/validate-networking-k8s-io-v1-ingress,mutating=false,failurePolicy=ignore,sideEffects=None,groups=networking.k8s.io,resources=ingresses,verbs=create;update;delete,versions=v1,name=vingress.sealos.io,admissionReviewVersions=v1

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
		if err := v.checkCname(i, &rule); err != nil {
			return err
		}
		if err := v.checkOwner(i, &rule); err != nil {
			return err
		}
	}
	return nil
}

func (v *IngressValidator) checkCname(i *netv1.Ingress, rule *netv1.IngressRule) error {
	// check if ingress host is end with domain
	if strings.HasSuffix(rule.Host, v.domain) {
		ilog.Info("ingress host is end with "+v.domain+", skip validate", "ingress namespace", i.Namespace, "ingress name", i.Name)
		return nil
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
	if !strings.HasSuffix(cname, v.domain) {
		ilog.Info("deny ingress host "+rule.Host+", cname is not end with "+v.domain, "ingress namespace", i.Namespace, "ingress name", i.Name, "cname", cname)
		return fmt.Errorf(code.MessageFormat, code.CodeAdmissionForIngressFailedCnameCheck, "can not verify ingress host "+rule.Host+", cname is not end with "+v.domain)
	}
	return nil
}

func (v *IngressValidator) checkOwner(i *netv1.Ingress, rule *netv1.IngressRule) error {
	iList := &netv1.IngressList{}
	if err := v.cache.List(context.Background(), iList, client.MatchingFields{IngressHostIndex: rule.Host}); err != nil {
		ilog.Error(err, "can not verify ingress host "+rule.Host+", list ingress error")
		return err
	}

	for _, exitsIngress := range iList.Items {
		if exitsIngress.Namespace != i.Namespace {
			ilog.Info("ingress host "+rule.Host+" is owned by "+i.Namespace+", skip validate", "ingress namespace", i.Namespace, "ingress name", i.Name)
			return fmt.Errorf(code.MessageFormat, code.CodeAdmissionForIngressFailedOwnerCheck, "ingress host "+rule.Host+" is owned by "+i.Namespace+", you can not create ingress with same host in other namespace")
		}
	}

	return nil
}
