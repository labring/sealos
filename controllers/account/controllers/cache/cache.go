// Copyright © 2023 sealos.
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

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	accounttypes "github.com/labring/sealos/controllers/pkg/types"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	ctrl "sigs.k8s.io/controller-runtime"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const podSchedulerNameField = "spec.schedulerName"

// Options limits cached objects to the fields consumed by account controllers.
func Options() ctrlcache.Options {
	return ctrlcache.Options{
		DefaultTransform: ctrlcache.TransformStripManagedFields(),
		ByObject: map[client.Object]ctrlcache.ByObject{
			&corev1.Namespace{}: {Transform: transformNamespace},
			&corev1.Pod{}: {
				Field: fields.OneTermEqualSelector(
					podSchedulerNameField,
					accountv1.DebtSchedulerName,
				),
				Transform: transformPod,
			},
			&userv1.User{}: {Transform: transformUser},
		},
	}
}

// UncachedObjects returns objects whose reads require complete, current API data.
func UncachedObjects() []client.Object {
	return []client.Object{
		&corev1.LimitRange{},
		// Other controllers need complete Pods; PodReconciler reads its projection
		// directly from the cache.
		&corev1.Pod{},
		&corev1.ResourceQuota{},
		&accountv1.Debt{},
		&notificationv1.Notification{},
	}
}

func transformNamespace(obj any) (any, error) {
	ns, ok := obj.(*corev1.Namespace)
	if !ok {
		return obj, nil
	}

	metadata := projectObjectMeta(ns.ObjectMeta)
	metadata.Labels = copyMapValues(ns.Labels, userv1.UserLabelOwnerKey)
	metadata.Annotations = copyMapValues(
		ns.Annotations,
		accounttypes.DebtNamespaceAnnoStatusKey,
		accounttypes.FinalDeletionReplayAnnotationKey,
		accounttypes.NetworkStatusAnnoKey,
		accounttypes.WorkspaceSubscriptionStatusAnnoKey,
		accounttypes.WorkspaceSubscriptionStatusUpdateTimeAnnoKey,
	)
	return &corev1.Namespace{
		TypeMeta:   ns.TypeMeta,
		ObjectMeta: metadata,
		Spec: corev1.NamespaceSpec{
			Finalizers: append([]corev1.FinalizerName(nil), ns.Spec.Finalizers...),
		},
		Status: corev1.NamespaceStatus{
			Phase: ns.Status.Phase,
		},
	}, nil
}

func transformPod(obj any) (any, error) {
	if metadata, ok := obj.(*metav1.PartialObjectMetadata); ok {
		return &metav1.PartialObjectMetadata{
			TypeMeta:   metadata.TypeMeta,
			ObjectMeta: projectObjectMeta(metadata.ObjectMeta),
		}, nil
	}
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return obj, nil
	}

	return &corev1.Pod{
		TypeMeta:   pod.TypeMeta,
		ObjectMeta: projectObjectMeta(pod.ObjectMeta),
		Spec: corev1.PodSpec{
			SchedulerName: pod.Spec.SchedulerName,
		},
		Status: corev1.PodStatus{
			Phase: pod.Status.Phase,
		},
	}, nil
}

func transformUser(obj any) (any, error) {
	if metadata, ok := obj.(*metav1.PartialObjectMetadata); ok {
		projected := &metav1.PartialObjectMetadata{
			TypeMeta:   metadata.TypeMeta,
			ObjectMeta: projectObjectMeta(metadata.ObjectMeta),
		}
		projected.Annotations = copyMapValues(
			metadata.Annotations,
			userv1.UserAnnotationOwnerKey,
			"user.sealos.io/init-account-time",
			"user.sealos.io/workspace-status",
		)
		return projected, nil
	}
	user, ok := obj.(*userv1.User)
	if !ok {
		return obj, nil
	}

	metadata := projectObjectMeta(user.ObjectMeta)
	metadata.Annotations = copyMapValues(
		user.Annotations,
		userv1.UserAnnotationOwnerKey,
		"user.sealos.io/init-account-time",
		"user.sealos.io/workspace-status",
	)
	return &userv1.User{
		TypeMeta:   user.TypeMeta,
		ObjectMeta: metadata,
	}, nil
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

func copyMapValues(source map[string]string, keys ...string) map[string]string {
	var result map[string]string
	for _, key := range keys {
		if value, ok := source[key]; ok {
			if result == nil {
				result = make(map[string]string)
			}
			result[key] = value
		}
	}
	return result
}

func SetupCache(mgr ctrl.Manager) error {
	ns := &corev1.Namespace{}
	nsNameFunc := func(obj client.Object) []string {
		_ns, ok := obj.(*corev1.Namespace)
		if !ok {
			return nil
		}
		return []string{_ns.Name}
	}
	nsOwnerFunc := func(obj client.Object) []string {
		_ns, ok := obj.(*corev1.Namespace)
		if !ok {
			return nil
		}
		return []string{_ns.Labels[userv1.UserLabelOwnerKey]}
	}

	for _, idx := range []struct {
		obj          client.Object
		field        string
		extractValue client.IndexerFunc
	}{
		{ns, accountv1.Name, nsNameFunc},
		{ns, accountv1.Owner, nsOwnerFunc},
	} {
		if err := mgr.GetFieldIndexer().
			IndexField(context.TODO(), idx.obj, idx.field, idx.extractValue); err != nil {
			return err
		}
	}
	return nil
}
