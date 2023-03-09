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
	"k8s.io/apimachinery/pkg/runtime"
	"os"
	ctrl "sigs.k8s.io/controller-runtime"

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

func (i *Debt) SetupWebhookWithManager(mgr ctrl.Manager) error {
	m := &DebtMutator{Client: mgr.GetClient()}
	return ctrl.NewWebhookManagedBy(mgr).
		For(i).
		WithDefaulter(m).
		Complete()
}

//+kubebuilder:webhook:path=/mutate-v1-pod,mutating=true,failurePolicy=fail,groups="*",resources=*,verbs=update,versions=v1,name=mpod.kb.io,admissionReviewVersions=v1,sideEffects=None
// +kubebuilder:object:generate=false

type DebtMutator struct {
	Client client.Client
}

func (d DebtMutator) Handle(ctx context.Context, request admission.Request) admission.Response {
	return admission.ValidationResponse(true, "")
}

func (d DebtMutator) Default(ctx context.Context, obj runtime.Object) error {
	return nil
	//logger.Info("getting req from ctx")
	//req, err := admission.RequestFromContext(ctx)
	//if err != nil {
	//	logger.Info("get request from context error when validate", "obj kind", obj.GetObjectKind())
	//	return err
	//}
	//
	//logger.Info("checking user", "user", req.UserInfo.Username)
	//kubeSystemGroup := fmt.Sprintf("%ss:%s", saPrefix, kubeSystemNamespace)
	//for _, g := range req.UserInfo.Groups {
	//	switch g {
	//	// if user is kubernetes-admin, pass it.
	//	case mastersGroup:
	//		logger.Info("pass for kubernetes-admin")
	//		return nil
	//	case kubeSystemGroup:
	//		logger.Info("pass for kube-system")
	//		return nil
	//	default:
	//		// continue to check other groups
	//		continue
	//	}
	//}
	//return nil
}

func checkOption(ctx context.Context, logger logr.Logger, c client.Client, nsName string) admission.Response {
	ns := corev1.Namespace{}
	if err := c.Get(ctx, client.ObjectKey{Name: nsName}, &ns); client.IgnoreNotFound(err) != nil {
		logger.Error(err, "get namespace error", "naName", nsName)
		return admission.ValidationResponse(true, nsName)
	}

	// Check if it is a user namespace
	user, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]
	if !ok {
		return admission.ValidationResponse(true, fmt.Sprintf("this namespace is not user namespace %s,or have not create", ns.Name))
	}

	account := Account{}
	if err := c.Get(ctx, client.ObjectKey{Name: user, Namespace: os.Getenv("ACCOUNT_NAMESPACE")}, &account); err != nil {
		logger.Error(err, "get account error")
		return admission.ValidationResponse(true, err.Error())
	}

	if account.Status.Balance-account.Status.DeductionBalance < 0 {
		return admission.ValidationResponse(false, fmt.Sprintf("account balance less than 0,now account is %d", account.Status.Balance-account.Status.DeductionBalance))
	}

	return admission.ValidationResponse(true, "")
}
