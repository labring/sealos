/*
Copyright 2022 labring.

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
	"strings"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
)

// log is for logging in this package.
var usergroupbindinglog = logf.Log.WithName("usergroupbinding-resource")

func (r *UserGroupBinding) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-user-sealos-io-v1-usergroupbinding,mutating=true,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=usergroupbindings,verbs=create;update,versions=v1,name=musergroupbinding.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &UserGroupBinding{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *UserGroupBinding) Default() {
	usergroupbindinglog.Info("default", "name", r.Name)
	r.ObjectMeta = initAnnotationAndLabels(r.ObjectMeta)
	if r.RoleRef == "" {
		r.RoleRef = RoleRefTypeUser
	}
	r.Labels[UgNameLabelKey] = r.UserGroupRef
	r.Labels[UgRoleLabelKey] = string(r.RoleRef)
	r.Labels[UgBindingKindLabelKey] = strings.ToLower(r.Subject.Kind)
	r.Labels[UgBindingNameLabelKey] = strings.ToLower(r.Subject.Name)
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-user-sealos-io-v1-usergroupbinding,mutating=false,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=usergroupbindings,verbs=create;update,versions=v1,name=vusergroupbinding.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &UserGroupBinding{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *UserGroupBinding) ValidateCreate() error {
	usergroupbindinglog.Info("validate create", "name", r.Name)
	if err := r.validateWebhook(); err != nil {
		return err
	}
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *UserGroupBinding) ValidateUpdate(old runtime.Object) error {
	usergroupbindinglog.Info("validate update", "name", r.Name)
	if err := r.validateWebhook(); err != nil {
		return err
	}
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *UserGroupBinding) ValidateDelete() error {
	usergroupbindinglog.Info("validate delete", "name", r.Name)

	// TODO(user): fill in your validation logic upon object deletion.
	return nil
}

func (r *UserGroupBinding) validateWebhook() error {
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationOwnerKey); err != nil {
		return err
	}
	if err := validateLabelKeyNotEmpty(r.ObjectMeta, UgNameLabelKey); err != nil {
		return err
	}
	if err := validateLabelKeyNotEmpty(r.ObjectMeta, UgRoleLabelKey); err != nil {
		return err
	}
	if err := validateLabelKeyNotEmpty(r.ObjectMeta, UgBindingKindLabelKey); err != nil {
		return err
	}
	if err := validateLabelKeyNotEmpty(r.ObjectMeta, UgBindingNameLabelKey); err != nil {
		return err
	}

	if r.RoleRef == "" {
		return errors.New("roleRef is not allowed to be empty")
	}
	if r.UserGroupRef == "" {
		return errors.New("userGroupRef not allow empty")
	}
	if r.Subject.Kind == "" {
		return errors.New("subject.kind not allow empty")
	}
	if r.Subject.Name == "" {
		return errors.New("subject.name not allow empty")
	}
	if r.Subject.APIGroup == "" && r.Subject.Kind != "Namespace" {
		return errors.New("subject.name not allow empty")
	}
	return nil
}
