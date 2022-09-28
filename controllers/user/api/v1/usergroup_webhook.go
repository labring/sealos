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
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
)

// log is for logging in this package.
var usergrouplog = logf.Log.WithName("usergroup-resource")

func (r *UserGroup) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-user-sealos-io-v1-usergroup,mutating=true,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=usergroups,verbs=create;update,versions=v1,name=musergroup.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &UserGroup{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *UserGroup) Default() {
	usergrouplog.Info("default", "name", r.Name)
	r.ObjectMeta = initAnnotationAndLabels(r.ObjectMeta)
	if r.Annotations[UserAnnotationDisplayKey] == "" {
		r.Annotations[UserAnnotationDisplayKey] = r.Name
	}
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-user-sealos-io-v1-usergroup,mutating=false,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=usergroups,verbs=create;update,versions=v1,name=vusergroup.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &UserGroup{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *UserGroup) ValidateCreate() error {
	usergrouplog.Info("validate create", "name", r.Name)
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationDisplayKey); err != nil {
		return err
	}
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationOwnerKey); err != nil {
		return err
	}
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *UserGroup) ValidateUpdate(old runtime.Object) error {
	usergrouplog.Info("validate update", "name", r.Name)
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationDisplayKey); err != nil {
		return err
	}
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationOwnerKey); err != nil {
		return err
	}
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *UserGroup) ValidateDelete() error {
	usergrouplog.Info("validate delete", "name", r.Name)

	// TODO(user): fill in your validation logic upon object deletion.
	return nil
}
