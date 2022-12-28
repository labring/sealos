/*
Copyright 2022.

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
	"strings"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var organizationlog = logf.Log.WithName("organization-resource")

func (r *Organization) SetupWebhookWithManager(mgr ctrl.Manager) error {
	m := &OrgMutator{Client: mgr.GetClient()}
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		WithDefaulter(m).
		Complete()
}

// +kubebuilder:webhook:path=/mutate-imagehub-sealos-io-v1-organization,mutating=true,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=organizations,verbs=create,versions=v1,name=morganization.kb.io,admissionReviewVersions=v1
// +kubebuilder:object:generate=false

type OrgMutator struct {
	client.Client
}

// Default mutate when create org
func (m OrgMutator) Default(ctx context.Context, obj runtime.Object) error {
	org, ok := obj.(*Organization)
	if !ok {
		return errors.New("obj convert Organization is error")
	}
	organizationlog.Info("default", "name", org.Name)
	req, err := admission.RequestFromContext(ctx)
	if err != nil {
		organizationlog.Info("get request from context error when validate", "obj name", org.Name)
		return err
	}
	// only change user-system user creation
	// get userName by replace "system:serviceaccount:user-system:labring-user-name" to "labring-user-name"
	org.Spec.Creator = strings.Replace(req.UserInfo.Username, fmt.Sprintf("%s:%s:", saPrefix, getUserNamespace()), "", -1)
	org.Spec.Manager = append(org.Spec.Manager, org.Spec.Creator)
	return nil
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-imagehub-sealos-io-v1-organization,mutating=false,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=organizations,verbs=create;update,versions=v1,name=vorganization.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &Organization{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *Organization) ValidateCreate() error {
	organizationlog.Info("validate create", "name", r.Name)

	// TODO(user): fill in your validation logic upon object creation.
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *Organization) ValidateUpdate(old runtime.Object) error {
	organizationlog.Info("validate update", "name", r.Name)

	// TODO(user): fill in your validation logic upon object update.
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *Organization) ValidateDelete() error {
	organizationlog.Info("validate delete", "name", r.Name)

	// TODO(user): fill in your validation logic upon object deletion.
	return nil
}
