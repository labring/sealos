/*
Copyright 2022 cuisongliu@qq.com.

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

package finalizer

import (
	"context"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

type Finalizer struct {
	client        client.Client
	finalizerName string
}

func (f *Finalizer) AddFinalizer(ctx context.Context, obj client.Object) (bool, error) {
	var notDelete bool
	if obj.GetDeletionTimestamp() == nil || obj.GetDeletionTimestamp().IsZero() {
		// The object is not being deleted, so if it does not have our finalizer,
		// then lets add the finalizer and update the object. This is equivalent
		// registering our finalizer.
		notDelete = true
		controllerutil.AddFinalizer(obj, f.finalizerName)
		if err := f.updateFinalizers(ctx, client.ObjectKeyFromObject(obj), obj, obj.GetFinalizers()); err != nil {
			return notDelete, err
		}
	}
	return notDelete, nil
}

func DefaultFunc(ctx context.Context, obj client.Object) error {
	return nil
}

func NewFinalizer(client client.Client, finalizerName string) *Finalizer {
	return &Finalizer{
		client:        client,
		finalizerName: finalizerName,
	}
}

func (f *Finalizer) RemoveFinalizer(ctx context.Context, obj client.Object, fun func(ctx context.Context, obj client.Object) error) (bool, error) {
	var deleteBool bool
	if obj.GetDeletionTimestamp() != nil && !obj.GetDeletionTimestamp().IsZero() {
		deleteBool = true
		if controllerutil.ContainsFinalizer(obj, f.finalizerName) {
			// our finalizer is present, so lets handle any external dependency
			if err := fun(ctx, obj); err != nil {
				return deleteBool, err
			}

			controllerutil.RemoveFinalizer(obj, f.finalizerName)
			if err := f.updateFinalizers(ctx, client.ObjectKeyFromObject(obj), obj, obj.GetFinalizers()); err != nil {
				return deleteBool, err
			}
		}
	}
	return deleteBool, nil
}

func (f *Finalizer) updateFinalizers(ctx context.Context, objectKey client.ObjectKey, obj client.Object, finalizers []string) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		gvk := obj.GetObjectKind().GroupVersionKind()
		fetchObject := &unstructured.Unstructured{}
		fetchObject.SetAPIVersion(gvk.GroupVersion().String())
		fetchObject.SetKind(gvk.Kind)
		err := f.client.Get(ctx, objectKey, fetchObject)
		if err != nil {
			// We log this error, but we continue and try to set the ownerRefs on the other resources.
			return err
		}
		fetchObject.SetFinalizers(finalizers)
		err = f.client.Update(ctx, fetchObject)
		if err != nil {
			// We log this error, but we continue and try to set the ownerRefs on the other resources.
			return err
		}
		return nil
	})
}
