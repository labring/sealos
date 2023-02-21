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
	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"os"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// +kubebuilder:webhook:path=/mutate-account-sealos-io-v1-debt,mutating=true,failurePolicy=fail,groups="",resources=pods,verbs=create;update,versions=v1,name=mpod.kb.io,admissionReviewVersions=v1,sideEffects=None
// +kubebuilder:object:generate=false

type DebtMutator struct {
	client.Client
}

// log is for logging in this package.
var debtlog = logf.Log.WithName("debt-resource")

func (r *Debt) SetupWebhookWithManager(mgr ctrl.Manager) error {
	m := &DebtMutator{Client: mgr.GetClient()}
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		WithDefaulter(m).
		Complete()
}

func (r *DebtMutator) Default(ctx context.Context, obj runtime.Object) error {
	return nil
}

func (r *DebtMutator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	return checkOption(ctx, debtlog, r.Client)
}

func (r *DebtMutator) ValidateUpdate(ctx context.Context, obj runtime.Object) error {
	return checkOption(ctx, debtlog, r.Client)
}

func checkOption(ctx context.Context, logger logr.Logger, c client.Client) error {
	fromContext, err := admission.RequestFromContext(ctx)
	if err != nil {
		return err
	}
	ns := corev1.Namespace{}
	if err := c.Get(ctx, client.ObjectKey{Name: fromContext.Namespace}, &ns); err != nil {
		logger.Error(err, "get namespace error")
		return err
	}

	if _, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]; !ok {
		logger.Info("this namespace is not user namespace", "namespace", ns.Name)
		return nil
	}

	account := Account{}
	if err := c.Get(ctx, client.ObjectKey{Name: ns.Name, Namespace: os.Getenv("ACCOUNT_NAMESPACE")}, &account); err != nil {
		logger.Error(err, "get account error")
		return err
	}

	if account.Status.Balance-account.Status.DeductionBalance < 0 {
		return errors.New("account balance less than 0")
	}
	return nil
}
