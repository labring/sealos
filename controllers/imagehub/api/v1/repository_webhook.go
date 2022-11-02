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
	"fmt"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
)

// log is for logging in this package.
var repositorylog = logf.Log.WithName("repository-resource")

func (r *Repository) SetupWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		Complete()
}

// TODO(user): EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!

//+kubebuilder:webhook:path=/mutate-imagehub-sealos-io-v1-repository,mutating=true,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=repositories,verbs=create;update,versions=v1,name=mrepository.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &Repository{}

// Default implements webhook.Defaulter so a webhook will be registered for the type
func (r *Repository) Default() {
	repositorylog.Info("default", "name", r.Name)
	r.ObjectMeta = initAnnotationAndLabels(r.ObjectMeta)
	r.ObjectMeta.Labels[SealosOrgLable] = r.Spec.Name.GetOrg()
	r.ObjectMeta.Labels[SealosRepoLabel] = r.Spec.Name.GetRepo()
}

// TODO(user): change verbs to "verbs=create;update;delete" if you want to enable deletion validation.
//+kubebuilder:webhook:path=/validate-imagehub-sealos-io-v1-repository,mutating=false,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=repositories,verbs=create;update,versions=v1,name=vrepository.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &Repository{}

// ValidateCreate implements webhook.Validator so a webhook will be registered for the type
func (r *Repository) ValidateCreate() error {
	repositorylog.Info("validate create", "name", r.Name)
	if !r.checkSpecName() {
		return fmt.Errorf("repo name illegal")
	}
	if !r.checkLables() {
		return fmt.Errorf("repo lable illegal")
	}
	return nil
}

// ValidateUpdate implements webhook.Validator so a webhook will be registered for the type
func (r *Repository) ValidateUpdate(old runtime.Object) error {
	repositorylog.Info("validate update", "name", r.Name)
	if !r.checkSpecName() {
		return fmt.Errorf("repo name illegal")
	}
	if !r.checkLables() {
		return fmt.Errorf("repo lable illegal")
	}
	return nil
}

// ValidateDelete implements webhook.Validator so a webhook will be registered for the type
func (r *Repository) ValidateDelete() error {
	repositorylog.Info("validate delete", "name", r.Name)

	// TODO(user): fill in your validation logic upon object deletion.
	return nil
}
