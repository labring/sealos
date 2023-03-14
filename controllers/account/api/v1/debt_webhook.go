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
	"fmt"

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	saPrefix            = "system:serviceaccount"
	mastersGroup        = "system:masters"
	kubeSystemNamespace = "kube-system"
)

var logger = logf.Log.WithName("debt-resource")

//func (i *Debt) SetupWebhookWithManager(mgr ctrl.Manager) error {
//	m := &DebtMutator{Client: mgr.GetClient()}
//	return ctrl.NewWebhookManagedBy(mgr).
//		For(i).
//		WithDefaulter(m).
//		Complete()
//}

//+kubebuilder:webhook:path=/mutate-v1-sealos-cloud,mutating=true,failurePolicy=ignore,groups="*",resources=*,verbs=create;update,versions=v1,name=mpod.kb.io,admissionReviewVersions=v1,sideEffects=None
// +kubebuilder:object:generate=false

type DebtValidate struct {
	Client client.Client
}

func (d DebtValidate) Handle(ctx context.Context, req admission.Request) admission.Response {
	logger.Info("checking user", "userInfo", req.UserInfo, "req.Namespace", req.Namespace, "req.Name", req.Name)
	kubeSystemGroup := fmt.Sprintf("%ss:%s", saPrefix, kubeSystemNamespace)
	for _, g := range req.UserInfo.Groups {
		switch g {
		// if user is kubernetes-admin, pass it
		case mastersGroup:
			logger.Info("pass for kubernetes-admin")
			return admission.ValidationResponse(true, "")
		case kubeSystemGroup:
			logger.Info("pass for kube-system")
			return admission.ValidationResponse(true, "")
		default:
			// continue to check other groups
			continue
		}
	}

	// check is user ns
	if len(req.Namespace) > 3 && req.Namespace[:3] == "ns-" {
		return checkOption(ctx, logger, d.Client, req.Namespace)
	}
	logger.Info("pass for NameSpace is not user ns", "req.Namespace", req.Namespace)
	return admission.ValidationResponse(true, "")
}

func checkOption(ctx context.Context, logger logr.Logger, c client.Client, nsName string) admission.Response {
	nsList := &corev1.NamespaceList{}
	if err := c.List(ctx, nsList, client.MatchingFields{"name": nsName}); err != nil {
		logger.Error(err, "list ns error", "naName", nsName, "nsList", nsList)
		return admission.ValidationResponse(true, nsName)
	}

	//ns name unique in k8s
	ns := nsList.Items[0]
	// Check if it is a user namespace
	user, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]
	if !ok {
		return admission.ValidationResponse(true, fmt.Sprintf("this namespace is not user namespace %s,or have not create", ns.Name))
	}

	accountList := AccountList{}
	if err := c.List(ctx, &accountList, client.MatchingFields{"name": user}); err != nil {
		logger.Error(err, "get account error", "user", user)
		return admission.ValidationResponse(true, err.Error())
	}

	for _, account := range accountList.Items {
		if account.Status.Balance-account.Status.DeductionBalance < 0 {
			return admission.ValidationResponse(false, fmt.Sprintf("account balance less than 0,now account is %.2f¥", float64(account.Status.Balance-account.Status.DeductionBalance)/100))
		}
	}
	return admission.ValidationResponse(true, "")
}
