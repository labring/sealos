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
var counterlog = logf.Log.WithName("counter-resource")

func (r *Counter) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

//+kubebuilder:webhook:path=/mutate-imagehub-sealos-io-v1-counter,mutating=true,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=counters,verbs=create;update,versions=v1,name=mcounter.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &Counter{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
// add label for Counter by using counter.RefName
func (r *Counter) Default() {
	counterlog.Info("default", "name", r.Name)
	r.ObjectMeta = initAnnotationAndLabels(r.ObjectMeta)
	r.Labels[CounterRefLabel] = r.Spec.RefName
	r.Labels[CounterTypeLabel] = string(r.Spec.Type)
}

//+kubebuilder:webhook:path=/validate-imagehub-sealos-io-v1-counter,mutating=false,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=counters,verbs=create;update,versions=v1,name=vcounter.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &Counter{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *Counter) ValidateCreate() error {
	counterlog.Info("validate create", "name", r.Name)

	// TODO(user): fill in your validation logic upon object creation.
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *Counter) ValidateUpdate(old runtime.Object) error {
	counterlog.Info("validate update", "name", r.Name)

	// TODO(user): fill in your validation logic upon object update.
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *Counter) ValidateDelete() error {
	counterlog.Info("validate delete", "name", r.Name)

	// TODO(user): fill in your validation logic upon object deletion.
	return nil
}
