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
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
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
	repo.ObjectMeta.Labels[SealosOrgLable] = repo.Spec.Name.GetOrg()
	repo.ObjectMeta.Labels[SealosRepoLabel] = repo.Spec.Name.GetRepo()

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
	return v.checkOption(ctx, r)
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
	return v.checkOption(ctx, nr)
}

func (v *RepoValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	r, ok := obj.(*Repository)
	if !ok {
		return errors.New("obj convert Repository is error")
	}
	repositorylog.Info("validating delete", "name", r.Name)
	repositorylog.Info("enter checkOption func", "name", r.Name)
	return v.checkOption(ctx, r)
}

func (v *RepoValidator) checkOption(ctx context.Context, r *Repository) error {
	repositorylog.Info("checking label and spec name", "repository name", r.Spec.Name)
	if !r.checkLabels() || !r.checkSpecName() {
		return fmt.Errorf("missing labels or repository.Spec.Name is IsLegal: %s", string(r.Spec.Name))
	}
	repositorylog.Info("getting org", "org", r.Spec.Name.GetOrg())
	org := &Organization{}
	if err := v.Get(ctx, client.ObjectKey{Name: r.Spec.Name.GetOrg()}, org); err != nil {
		if client.IgnoreNotFound(err) == nil {
			return fmt.Errorf("organization not exited %s", r.Spec.Name.GetOrg())
		}
		return fmt.Errorf("get Organization error %s", r.Spec.Name.GetOrg())
	}
	repositorylog.Info("org info", "org", org)
	repositorylog.Info("getting req from ctx")
	req, err := admission.RequestFromContext(ctx)
	if err != nil {
		repositorylog.Info("get request from context error when validate", "repository name", r.Name)
		return err
	}
	repositorylog.Info("checking user", "user", req.UserInfo.Username)
	// get sa namespace prefix, prefix format is like: "system:serviceaccount:user-system:"
	namespacePrefix := fmt.Sprintf("%s:%s:", saPrefix, getUserNamespace())
	// req.UserInfo.Username e.g: system:serviceaccount:user-system:labring
	if !strings.HasPrefix(req.UserInfo.Username, namespacePrefix) {
		return fmt.Errorf("denied, you are not one of user in %s", namespacePrefix)
	}
	// replace it and compare
	userName := strings.Replace(req.UserInfo.Username, namespacePrefix, "", -1)
	repositorylog.Info("checking username", "user", userName)
	for _, usr := range org.Spec.Manager {
		if usr == userName {
			return nil
		}
	}
	repositorylog.Info("denied", "repository name", r.Name)
	return fmt.Errorf("denied, you are not one of organization %s managers", r.Spec.Name.GetOrg())
}
