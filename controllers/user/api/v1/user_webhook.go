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
	"context"
	"errors"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var userlog = logf.Log.WithName("user-webhook")

func (r *User) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-user-sealos-io-v1-user,mutating=true,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=users,verbs=create;update,versions=v1,name=muser.kb.io,admissionReviewVersions=v1

var _ webhook.CustomDefaulter = &User{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *User) Default(ctx context.Context, obj runtime.Object) error {
	userlog.Info("default", "name", r.Name)
	user, ok := obj.(*User)
	if !ok {
		return errors.New("obj convert User is error")
	}
	user.ObjectMeta = initAnnotationAndLabels(user.ObjectMeta)
	if user.Spec.CSRExpirationSeconds == 0 {
		user.Spec.CSRExpirationSeconds = 7200
	}
	if r.Annotations[UserAnnotationDisplayKey] == "" {
		r.Annotations[UserAnnotationDisplayKey] = r.Name
	}
	if r.Annotations[UserAnnotationOwnerKey] == "" {
		r.Annotations[UserAnnotationOwnerKey] = r.Name
	}
	return nil
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-user-sealos-io-v1-user,mutating=false,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=users,verbs=create;update,versions=v1,name=vuser.kb.io,admissionReviewVersions=v1

var _ webhook.CustomValidator = &User{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateCreate(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {
	userlog.Info("validate create", "name", r.Name)
	user, ok := obj.(*User)
	if !ok {
		return admission.Warnings{}, errors.New("obj convert User is error")
	}
	if err := user.validateCSRExpirationSeconds(); err != nil {
		return admission.Warnings{}, err
	}
	return admission.Warnings{}, validateAnnotationKeyNotEmpty(user.ObjectMeta, UserAnnotationDisplayKey)
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateUpdate(ctx context.Context, old runtime.Object, new runtime.Object) (admission.Warnings, error) {
	userlog.Info("validate update", "name", r.Name)
	user, ok := new.(*User)
	if !ok {
		return admission.Warnings{}, errors.New("obj convert User is error")
	}
	if err := user.validateCSRExpirationSeconds(); err != nil {
		return admission.Warnings{}, err
	}
	return admission.Warnings{}, validateAnnotationKeyNotEmpty(user.ObjectMeta, UserAnnotationDisplayKey)
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateDelete(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {
	userlog.Info("validate delete", "name", r.Name)
	user, ok := obj.(*User)
	if !ok {
		return admission.Warnings{}, errors.New("obj convert User is error")
	}
	return admission.Warnings{}, validateAnnotationKeyNotEmpty(user.ObjectMeta, UserAnnotationDisplayKey)
}
