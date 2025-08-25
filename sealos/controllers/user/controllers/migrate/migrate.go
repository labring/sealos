/*
Copyright 2023 cuisongliu@qq.com.

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

package migrate

import (
	"context"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

var UGBindingFinalizer = "sealos.io/user.group.binding.finalizers"
var UGFinalizer = "sealos.io/user.group.finalizers"

func RemoveFinalizer(ctx context.Context, cli client.Client, obj client.Object, oldFinalizer string) {
	oldFinalizerName := oldFinalizer
	if controllerutil.ContainsFinalizer(obj, oldFinalizerName) {
		controllerutil.RemoveFinalizer(obj, oldFinalizerName)
	}
	_ = retry.RetryOnConflict(retry.DefaultRetry, func() error {
		return cli.Update(ctx, obj)
	})
}

func SetOwner(ctx context.Context, cli client.Client, obj client.Object, owner client.Object) {
	_ = retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if owner == nil {
			obj.SetOwnerReferences([]v1.OwnerReference{})
			return cli.Update(ctx, obj)
		}
		_, err := controllerutil.CreateOrUpdate(ctx, cli, obj, func() error {
			return controllerutil.SetControllerReference(owner, obj, cli.Scheme())
		})
		return err
	})
}
