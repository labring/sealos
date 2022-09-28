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
var userlog = logf.Log.WithName("user-resource")

func (r *User) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-user-sealos-io-v1-user,mutating=true,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=users,verbs=create;update,versions=v1,name=muser.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &User{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *User) Default() {
	userlog.Info("default", "name", r.Name)
	r.ObjectMeta = initAnnotationAndLabels(r.ObjectMeta)
	if r.Spec.CSRExpirationSeconds == 0 {
		r.Spec.CSRExpirationSeconds = 7200
	}
	if r.Annotations[UserAnnotationDisplayKey] == "" {
		r.Annotations[UserAnnotationDisplayKey] = r.Name
	}
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-user-sealos-io-v1-user,mutating=false,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=users,verbs=create;update,versions=v1,name=vuser.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &User{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateCreate() error {
	userlog.Info("validate create", "name", r.Name)
	if err := r.validateCSRExpirationSeconds(); err != nil {
		return err
	}
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationDisplayKey); err != nil {
		return err
	}
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateUpdate(old runtime.Object) error {
	userlog.Info("validate update", "name", r.Name)
	if err := r.validateCSRExpirationSeconds(); err != nil {
		return err
	}
	if err := validateAnnotationKeyNotEmpty(r.ObjectMeta, UserAnnotationDisplayKey); err != nil {
		return err
	}
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateDelete() error {
	userlog.Info("validate delete", "name", r.Name)
	return nil
}
