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

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// log is for logging in this package.
var repositorylog = logf.Log.WithName("repository-resource")

func (r *Repository) SetupWebhookWithManager(mgr ctrl.Manager) error {
	m := &RepoMutator{Client: mgr.GetClient()}
	v := &RepoValidator{Client: mgr.GetClient()}
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		WithDefaulter(m).
		WithValidator(v).
		Complete()
}

//+kubebuilder:webhook:path=/mutate-imagehub-sealos-io-v1-repository,mutating=true,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=repositories,verbs=create;update,versions=v1,name=mrepository.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type RepoMutator struct {
	client.Client
}

func (m RepoMutator) Default(ctx context.Context, obj runtime.Object) error {
	repo, ok := obj.(*Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	repositorylog.Info("default", "name", repo.Name)
	repo.ObjectMeta = initAnnotationAndLabels(repo.ObjectMeta)
	repo.Labels[SealosOrgLable] = repo.Spec.Name.GetOrg()
	repo.Labels[SealosRepoLabel] = repo.Spec.Name.GetRepo()
	if repo.Status.LatestTag != nil {
		img := &Image{}
		err := m.Client.Get(ctx, client.ObjectKey{Name: repo.Status.LatestTag.MetaName}, img)
		if err != nil {
			return err
		}
		repo.genKeywordsLabels(img)
	}
	return nil
}

//+kubebuilder:webhook:path=/validate-imagehub-sealos-io-v1-repository,mutating=false,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=repositories,verbs=create;update;delete,versions=v1,name=vrepository.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

// RepoValidator will validate Repositories change.
type RepoValidator struct {
	client.Client
}

func (v *RepoValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	r, ok := obj.(*Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	repositorylog.Info("validating create", "name", r.Name)
	repositorylog.Info("enter checkOption func", "name", r.Name)
	return checkOption(ctx, repositorylog, v.Client, r)
}

func (v *RepoValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {
	nr, ok := newObj.(*Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	or, ok := oldObj.(*Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	imagelog.Info("validating update", "name", or.Name)
	if nr.Spec.Name != or.Spec.Name {
		return fmt.Errorf("can not change spec.name: %s", string(nr.Spec.Name))
	}
	imagelog.Info("enter checkOption func", "name", nr.Name)
	return checkOption(ctx, repositorylog, v.Client, nr)
}

func (v *RepoValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	r, ok := obj.(*Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	repositorylog.Info("validating delete", "name", r.Name)
	repositorylog.Info("enter checkOption func", "name", r.Name)
	return checkOption(ctx, repositorylog, v.Client, r)
}
