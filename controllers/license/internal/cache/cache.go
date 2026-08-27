// Copyright 2026 labring.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cache

import (
	"context"
	"fmt"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// Options retains only the fields used for event delivery and node validation.
func Options() ctrlcache.Options {
	return ctrlcache.Options{
		ReaderFailOnMissingInformer: true,
		DefaultTransform:            ctrlcache.TransformStripManagedFields(),
		ByObject: map[client.Object]ctrlcache.ByObject{
			&licensev1.License{}: {Transform: transformLicense},
			&corev1.Node{}:       {Transform: transformNode},
		},
	}
}

// UncachedObjects keeps reads that require complete or low-frequency objects on the API server.
func UncachedObjects() []client.Object {
	return []client.Object{
		&licensev1.License{},
		&corev1.Namespace{},
		&notificationv1.Notification{},
		&userv1.User{},
	}
}

// SetupInformers registers the Node informer used by license validation. The License
// informer is registered by the controller builder.
func SetupInformers(mgr ctrl.Manager) error {
	if _, err := mgr.GetCache().GetInformer(context.Background(), &corev1.Node{}); err != nil {
		return fmt.Errorf("register node informer: %w", err)
	}
	return nil
}

func transformLicense(obj any) (any, error) {
	license, ok := obj.(*licensev1.License)
	if !ok {
		return obj, nil
	}

	return &licensev1.License{
		TypeMeta:   license.TypeMeta,
		ObjectMeta: projectObjectMeta(license.ObjectMeta),
	}, nil
}

func transformNode(obj any) (any, error) {
	node, ok := obj.(*corev1.Node)
	if !ok {
		return obj, nil
	}

	return &corev1.Node{
		TypeMeta:   node.TypeMeta,
		ObjectMeta: projectObjectMeta(node.ObjectMeta),
		Status: corev1.NodeStatus{
			Allocatable: copyNodeAllocatable(node.Status.Allocatable),
		},
	}, nil
}

func copyNodeAllocatable(source corev1.ResourceList) corev1.ResourceList {
	var result corev1.ResourceList
	for _, name := range []corev1.ResourceName{corev1.ResourceCPU, corev1.ResourceMemory} {
		if quantity, ok := source[name]; ok {
			if result == nil {
				result = make(corev1.ResourceList, 2)
			}
			result[name] = quantity.DeepCopy()
		}
	}
	return result
}

func projectObjectMeta(in metav1.ObjectMeta) metav1.ObjectMeta {
	out := metav1.ObjectMeta{
		Name:              in.Name,
		Namespace:         in.Namespace,
		UID:               in.UID,
		ResourceVersion:   in.ResourceVersion,
		Generation:        in.Generation,
		CreationTimestamp: in.CreationTimestamp,
	}
	if in.DeletionTimestamp != nil {
		out.DeletionTimestamp = in.DeletionTimestamp.DeepCopy()
	}
	if in.DeletionGracePeriodSeconds != nil {
		gracePeriod := *in.DeletionGracePeriodSeconds
		out.DeletionGracePeriodSeconds = &gracePeriod
	}
	return out
}
