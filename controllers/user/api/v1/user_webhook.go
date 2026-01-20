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
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"

	"github.com/labring/sealos/controllers/user/pkg/licensegate"
)

// log is for logging in this package.
var userlog = logf.Log.WithName("user-webhook")
var userWebhookReader client.Reader

const licenseLimitErrorMessage = "{\"code\":40301,\"message\":\"license inactive: user limit reached\"}"

func (r *User) SetupWebhookWithManager(mgr ctrl.Manager) error {
	userWebhookReader = mgr.GetAPIReader()
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		WithDefaulter(r).
		WithValidator(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-user-sealos-io-v1-user,mutating=true,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=users,verbs=create;update,versions=v1,name=muser.kb.io,admissionReviewVersions=v1

var _ webhook.CustomDefaulter = &User{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *User) Default(ctx context.Context, obj runtime.Object) error {
	user, ok := obj.(*User)
	if !ok {
		return errors.New("obj convert User is error")
	}
	userlog.Info("default", "name", user.Name)
	user.ObjectMeta = initAnnotationAndLabels(user.ObjectMeta)
	if user.Spec.CSRExpirationSeconds == 0 {
		user.Spec.CSRExpirationSeconds = 7200
	}
	if user.Annotations[UserAnnotationDisplayKey] == "" {
		user.Annotations[UserAnnotationDisplayKey] = user.Name
	}
	if user.Annotations[UserAnnotationOwnerKey] == "" {
		user.Annotations[UserAnnotationOwnerKey] = user.Name
	}
	return nil
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-user-sealos-io-v1-user,mutating=false,failurePolicy=fail,sideEffects=None,groups=user.sealos.io,resources=users,verbs=create;update,versions=v1,name=vuser.kb.io,admissionReviewVersions=v1

var _ webhook.CustomValidator = &User{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateCreate(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {
	user, ok := obj.(*User)
	if !ok {
		return admission.Warnings{}, errors.New("obj convert User is error")
	}
	userlog.Info("validate create", "name", user.Name)
	if err := user.validateCSRExpirationSeconds(); err != nil {
		return admission.Warnings{}, err
	}
	if userWebhookReader == nil {
		return admission.Warnings{}, errors.New("user webhook reader is not initialized")
	}
	if !licensegate.HasActiveLicense() {
		userList := &UserList{}
		if err := userWebhookReader.List(ctx, userList); err != nil {
			return admission.Warnings{}, err
		}
		if !licensegate.AllowNewUser(len(userList.Items)) {
			warnings := admission.Warnings{licenseLimitErrorMessage}
			return warnings, errors.New(licenseLimitErrorMessage)
		}
	}
	return admission.Warnings{}, validateAnnotationKeyNotEmpty(user.ObjectMeta, UserAnnotationDisplayKey)
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateUpdate(ctx context.Context, old runtime.Object, new runtime.Object) (admission.Warnings, error) {
	user, ok := new.(*User)
	if !ok {
		return admission.Warnings{}, errors.New("obj convert User is error")
	}
	userlog.Info("validate update", "name", user.Name)
	if err := user.validateCSRExpirationSeconds(); err != nil {
		return admission.Warnings{}, err
	}
	return admission.Warnings{}, validateAnnotationKeyNotEmpty(user.ObjectMeta, UserAnnotationDisplayKey)
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *User) ValidateDelete(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {
	user, ok := obj.(*User)
	if !ok {
		return admission.Warnings{}, errors.New("obj convert User is error")
	}
	userlog.Info("validate delete", "name", user.Name)
	return admission.Warnings{}, validateAnnotationKeyNotEmpty(user.ObjectMeta, UserAnnotationDisplayKey)
}
