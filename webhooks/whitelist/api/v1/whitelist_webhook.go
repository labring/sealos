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
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
)

// log is for logging in this package.
var whitelistlog = logf.Log.WithName("whitelist-resource")

func (r *Whitelist) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-resource-sealos-io-v1-whitelist,mutating=true,failurePolicy=fail,sideEffects=None,groups=resource.sealos.io,resources=whitelists,verbs=create;update,versions=v1,name=mwhitelist.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &Whitelist{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *Whitelist) Default() {
	whitelistlog.Info("default", "name", r.Name)

	// TODO(user): fill in your defaulting logic.
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-resource-sealos-io-v1-whitelist,mutating=false,failurePolicy=fail,sideEffects=None,groups=resource.sealos.io,resources=whitelists,verbs=create;update,versions=v1,name=vwhitelist.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &Whitelist{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *Whitelist) ValidateCreate() error {
	whitelistlog.Info("validate create", "name", r.Name)

	// TODO(user): fill in your validation logic upon object creation.
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *Whitelist) ValidateUpdate(old runtime.Object) error {
	whitelistlog.Info("validate update", "name", r.Name)

	// TODO(user): fill in your validation logic upon object update.
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *Whitelist) ValidateDelete() error {
	whitelistlog.Info("validate delete", "name", r.Name)

	// TODO(user): fill in your validation logic upon object deletion.
	return nil
}
