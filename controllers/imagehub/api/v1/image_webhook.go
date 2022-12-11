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
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging in this package.
var imagelog = logf.Log.WithName("image-resource")

func (r *Image) SetupWebhookWithManager(mgr ctrl.Manager) error {
	m := &ImageMutater{Client: mgr.GetClient()}
	v := &ImageValidator{Client: mgr.GetClient()}
	return ctrl.NewWebhookManagedBy(mgr).
		For(r).
		WithDefaulter(m).
		WithValidator(v).
		Complete()
}

//+kubebuilder:webhook:path=/mutate-imagehub-sealos-io-v1-image,mutating=true,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=images,verbs=create;update,versions=v1,name=mimage.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

type ImageMutater struct {
	admission.Defaulter
	client.Client
}

func (r *ImageMutater) Default(ctx context.Context, obj runtime.Object) error {
	img, ok := obj.(*Image)
	if !ok {
		return errors.New("obj convert Image is error")
	}
	imagelog.Info("default", "name", img.Name)
	img.ObjectMeta = initAnnotationAndLabels(img.ObjectMeta)
	img.ObjectMeta.Labels[SealosOrgLable] = img.Spec.Name.GetOrg()
	img.ObjectMeta.Labels[SealosRepoLabel] = img.Spec.Name.GetRepo()
	img.ObjectMeta.Labels[SealosTagLabel] = img.Spec.Name.GetTag()
	return nil
}

//+kubebuilder:webhook:path=/validate-imagehub-sealos-io-v1-image,mutating=false,failurePolicy=fail,sideEffects=None,groups=imagehub.sealos.io,resources=images,verbs=create;update;delete,versions=v1,name=vimage.kb.io,admissionReviewVersions=v1
//+kubebuilder:object:generate=false

// ImageValidator will validate Images change.
type ImageValidator struct {
	admission.Validator
	Client client.Client
}

func (v *ImageValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*Image)
	if !ok {
		return errors.New("obj convert Image is error")
	}
	imagelog.Info("validating create", "name", i.Name)
	return checkOption(ctx, v.Client, i)
}

func (v *ImageValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {
	ni, ok := newObj.(*Image)
	if !ok {
		return errors.New("obj convert Image is error")
	}
	oi, ok := oldObj.(*Image)
	if !ok {
		return errors.New("obj convert Image is error")
	}
	imagelog.Info("validating update", "name", oi.Name)
	if ni.Spec.Name != oi.Spec.Name {
		return fmt.Errorf("can not change spec.name: %s", string(ni.Spec.Name))
	}
	return checkOption(ctx, v.Client, ni)
}

func (v *ImageValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	i, ok := obj.(*Image)
	if !ok {
		return errors.New("obj convert Image is error")
	}
	imagelog.Info("validating delete", "name", i.Name)
	return checkOption(ctx, v.Client, i)
}

func checkOption(ctx context.Context, c client.Client, i *Image) error {
	if !i.checkLables() || !i.checkSpecName() {
		return fmt.Errorf("missing lables or image.Spec.Name is IsLegal: %s", string(i.Spec.Name))
	}
	org := &Organization{}
	if err := c.Get(ctx, client.ObjectKey{Name: i.Spec.Name.GetOrg()}, org); err != nil {
		if client.IgnoreNotFound(err) == nil {
			return fmt.Errorf("organization not exited %s", i.Spec.Name.GetOrg())
		}
		return fmt.Errorf("get Organization error %s", i.Spec.Name.GetOrg())
	}
	req, err := admission.RequestFromContext(ctx)
	if err != nil {
		imagelog.Info("get request from context error when validate", "image name", i.Name)
		return err
	}
	for _, usr := range org.Spec.Manager {
		if usr == req.UserInfo.Username {
			return nil
		}
	}
	imagelog.Info("denied", "image name", i.Name)
	return fmt.Errorf("denied, you are not one of organization %s managers", i.Spec.Name.GetOrg())
}
