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
	"net"
	"os"
	"strings"
	"time"

	"github.com/labring/sealos/webhook/admission/pkg/code"

	netv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/cache"
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
	Domains            DomainList
	IngressAnnotations map[string]string
}

func (m *IngressMutator) SetupWithManager(mgr ctrl.Manager) error {
	m.Client = mgr.GetClient()
	return builder.WebhookManagedBy(mgr).
		For(&netv1.Ingress{}).
		WithDefaulter(m).
		Complete()
}

func (m *IngressMutator) Default(_ context.Context, obj runtime.Object) error {
	i, ok := obj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}

	for _, domain := range m.Domains {
		if isUserNamespace(i.Namespace) && hasSubDomain(i, domain) {
			ilog.Info("mutating ingress in user ns", "ingress namespace", i.Namespace, "ingress name", i.Name)
			m.mutateUserIngressAnnotations(i)
		}
	}
	return nil
}

func (m *IngressMutator) mutateUserIngressAnnotations(i *netv1.Ingress) {
	initAnnotationAndLabels(&i.ObjectMeta)
	for k, v := range m.IngressAnnotations {
		i.Annotations[k] = v
	}
}

//+kubebuilder:object:generate=false

type IngressValidator struct {
	client.Client
	Domains DomainList
	cache   cache.Cache

	IcpValidator *IcpValidator
}

const IngressHostIndex = "host"

func (v *IngressValidator) SetupWithManager(mgr ctrl.Manager) error {
	ilog.Info("starting webhook cache map")

	v.Client = mgr.GetClient()
	v.cache = mgr.GetCache()
	v.IcpValidator = NewIcpValidator(
		os.Getenv("ICP_ENABLED") == "true",
		os.Getenv("ICP_ENDPOINT"),
		os.Getenv("ICP_KEY"),
	)

	err := v.cache.IndexField(
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
		WithValidator(v).
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

func (v *IngressValidator) ValidateDelete(_ context.Context, obj runtime.Object) error {
	i, ok := obj.(*netv1.Ingress)
	if !ok {
		return errors.New("obj convert Ingress is error")
	}

	ilog.Info("validating delete", "ingress namespace", i.Namespace, "ingress name", i.Name)
	// delete ingress, pass validate
	return nil
}

func (v *IngressValidator) validate(ctx context.Context, i *netv1.Ingress) error {
	// count validate cost time

	startTime := time.Now()
	defer func() {
		ilog.Info("finished validate", "ingress namespace", i.Namespace, "ingress name", i.Name, "cost", time.Since(startTime))
	}()

	request, _ := admission.RequestFromContext(ctx)
	ilog.Info("validating", "ingress namespace", i.Namespace, "ingress name", i.Name, "user", request.UserInfo.Username, "userGroups", request.UserInfo.Groups)
	if !isUserServiceAccount(request.UserInfo.Username) {
		ilog.Info("user is not user's serviceaccount, skip validate")
		return nil
	}

	if !isUserNamespace(i.Namespace) {
		ilog.Info("namespace is system namespace, skip validate")
		return nil
	}

	checks := []func(*netv1.Ingress, *netv1.IngressRule) error{
		v.checkCname,
		v.checkOwner,
		v.checkIcp,
	}

	for _, rule := range i.Spec.Rules {
		for _, check := range checks {
			if err := check(i, &rule); err != nil {
				return err
			}
		}
	}

	return nil
}

func (v *IngressValidator) checkCname(i *netv1.Ingress, rule *netv1.IngressRule) error {
	ilog.Info("checking cname", "ingress namespace", i.Namespace, "ingress name", i.Name, "rule host", rule.Host)
	ilog.Info("domains:", "domains", strings.Join(v.Domains, ","))
	// get cname and check if it is cname to domain
	cname, err := net.LookupCNAME(rule.Host)
	if err != nil {
		ilog.Error(err, "can not verify ingress host "+rule.Host+", lookup cname error")
		return err
	}
	// remove last dot
	cname = strings.TrimSuffix(cname, ".")
	for _, domain := range v.Domains {
		// check if ingress host is end with domain
		if strings.HasSuffix(rule.Host, domain) {
			ilog.Info("ingress host is end with "+domain+", skip validate", "ingress namespace", i.Namespace, "ingress name", i.Name)
			return nil
		}
		// if cname is not end with domain, return error
		if strings.HasSuffix(cname, domain) {
			ilog.Info("ingress host "+rule.Host+" is cname to "+cname+", pass checkCname validate", "ingress namespace", i.Namespace, "ingress name", i.Name, "cname", cname)
			return nil
		}
	}
	return fmt.Errorf(code.MessageFormat, code.IngressFailedCnameCheck, "can not verify ingress host "+rule.Host+", cname is not end with any domains in "+strings.Join(v.Domains, ","))
}

func (v *IngressValidator) checkOwner(i *netv1.Ingress, rule *netv1.IngressRule) error {
	iList := &netv1.IngressList{}
	if err := v.cache.List(context.Background(), iList, client.MatchingFields{IngressHostIndex: rule.Host}); err != nil {
		ilog.Error(err, "can not verify ingress host "+rule.Host+", list ingress error")
		return fmt.Errorf(code.MessageFormat, code.IngressFailedOwnerCheck, err.Error())
	}

	for _, exitsIngress := range iList.Items {
		if exitsIngress.Namespace != i.Namespace {
			ilog.Info("ingress host "+rule.Host+" is owned by "+i.Namespace+", failed validate", "ingress namespace", i.Namespace, "ingress name", i.Name)
			return fmt.Errorf(code.MessageFormat, code.IngressFailedOwnerCheck, "ingress host "+rule.Host+" is owned by other user, you can not create ingress with same host.")
		}
	}
	// pass owner check
	ilog.Info("ingress host "+rule.Host+" pass checkOwner validate", "ingress namespace", i.Namespace, "ingress name", i.Name)
	return nil
}

func (v *IngressValidator) checkIcp(i *netv1.Ingress, rule *netv1.IngressRule) error {
	if !v.IcpValidator.enabled {
		ilog.Info("icp is disabled, skip check icp", "ingress namespace", i.Namespace, "ingress name", i.Name, "rule host", rule.Host)
		return nil
	}
	// check rule.host icp
	icpRep, err := v.IcpValidator.Query(rule)
	if err != nil {
		ilog.Error(err, "can not verify ingress host "+rule.Host+", icp query error")
		return fmt.Errorf(code.MessageFormat, code.IngressWebhookInternalError, "can not verify ingress host "+rule.Host+", icp query error")
	}
	if icpRep.ErrorCode != 0 {
		ilog.Error(err, "icp query error", "ingress namespace", i.Namespace, "ingress name", i.Name, "rule host", rule.Host, "icp error code", icpRep.ErrorCode, "icp reason", icpRep.Reason)
		return fmt.Errorf(code.MessageFormat, code.IngressWebhookInternalError, icpRep.Reason)
	}
	// if icpRep.Result.SiteLicense is empty, return error, failed validate
	if icpRep.Result.SiteLicense == "" {
		ilog.Info("deny ingress host "+rule.Host+", icp query result is empty", "ingress namespace", i.Namespace, "ingress name", i.Name, "rule host", rule.Host, "icp result", icpRep.Result)
		return fmt.Errorf(code.MessageFormat, code.IngressFailedIcpCheck, "icp query result is empty")
	}
	// pass icp check
	ilog.Info("ingress host "+rule.Host+" pass checkIcp validate", "ingress namespace", i.Namespace, "ingress name", i.Name, "rule host", rule.Host, "icp result", icpRep.Result)
	return nil
}
