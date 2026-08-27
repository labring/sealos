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

	kbv1alpha1 "github.com/apecloud/kubeblocks/apis/dataprotection/v1alpha1"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	"github.com/labring/sealos/controllers/pkg/gpu"
	"github.com/labring/sealos/controllers/pkg/resources"
	accounttypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/label"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	ctrl "sigs.k8s.io/controller-runtime"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	gpuAliasConfigKey             = "alias"
	gpuInfoConfigKey              = "gpu"
	backupRepositoryLabelKey      = "dataprotection.kubeblocks.io/backup-repo-name"
	networkStatusAnnotationKey    = "network.sealos.io/status"
	originalNodePortLabelKey      = "network.sealos.io/original-nodeport"
	persistentVolumeClaimPhaseKey = "status.phase"
	backupPhaseKey                = "status.phase"
	serviceTypeKey                = "spec.type"
)

// Options retains only the Kubernetes fields used by resource monitoring.
func Options() ctrlcache.Options {
	return ctrlcache.Options{
		ReaderFailOnMissingInformer: true,
		DefaultTransform:            ctrlcache.TransformStripManagedFields(),
		ByObject: map[client.Object]ctrlcache.ByObject{
			&corev1.Namespace{}: {
				Transform: transformNamespace,
			},
			&corev1.Pod{}: {
				Transform: transformPod,
			},
			&corev1.PersistentVolumeClaim{}: {
				Transform: transformPersistentVolumeClaim,
			},
			&kbv1alpha1.Backup{}: {
				Transform: transformBackup,
			},
			&corev1.Service{}: {
				Transform: transformService,
			},
			&appv1.Instance{}: {
				Transform: transformInstance,
			},
			&corev1.ConfigMap{}: {
				Namespaces: map[string]ctrlcache.Config{
					gpu.NodeInfoConfigmapNamespace: {
						FieldSelector: fields.OneTermEqualSelector(
							"metadata.name",
							gpu.NodeInfoConfigmapName,
						),
					},
				},
				Transform: transformGPUConfigMap,
			},
		},
	}
}

// UncachedObjects keeps general controller reads and all writes on complete API objects.
func UncachedObjects() []client.Object {
	return []client.Object{
		&corev1.Namespace{},
		&corev1.Pod{},
		&corev1.PersistentVolumeClaim{},
		&kbv1alpha1.Backup{},
		&corev1.Service{},
		&appv1.Instance{},
		&corev1.ConfigMap{},
	}
}

// SetupInformers registers projected informers that are read only by the periodic monitor.
func SetupInformers(mgr ctrl.Manager) error {
	instanceMetadata := &metav1.PartialObjectMetadata{}
	instanceMetadata.SetGroupVersionKind(appv1.GroupVersion.WithKind("Instance"))
	objects := []client.Object{
		&corev1.Namespace{},
		&corev1.Pod{},
		&corev1.ConfigMap{},
		instanceMetadata,
	}

	for _, object := range objects {
		if _, err := mgr.GetCache().GetInformer(context.Background(), object); err != nil {
			return fmt.Errorf("register informer for %T: %w", object, err)
		}
	}
	return nil
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
		accounttypes.WorkspaceSubscriptionStatusAnnoKey,
		networkStatusAnnotationKey,
	)
	return &corev1.Namespace{
		TypeMeta:   ns.TypeMeta,
		ObjectMeta: metadata,
	}, nil
}

func transformPod(obj any) (any, error) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return obj, nil
	}

	containers := make([]corev1.Container, 0, len(pod.Spec.Containers))
	for i := range pod.Spec.Containers {
		container := &pod.Spec.Containers[i]
		projected := corev1.Container{
			Name: container.Name,
			Resources: corev1.ResourceRequirements{
				Limits:   copyResourceList(container.Resources.Limits),
				Requests: copyResourceList(container.Resources.Requests),
			},
		}
		if container.Name == "acmesolver" {
			projected.Args = append([]string(nil), container.Args...)
		}
		containers = append(containers, projected)
	}

	metadata := projectObjectMeta(pod.ObjectMeta)
	metadata.Labels = resourceLabels(pod.Labels)
	projected := &corev1.Pod{
		TypeMeta:   pod.TypeMeta,
		ObjectMeta: metadata,
		Spec: corev1.PodSpec{
			NodeName:   pod.Spec.NodeName,
			Containers: containers,
		},
		Status: corev1.PodStatus{
			Phase: pod.Status.Phase,
		},
	}
	if pod.Status.StartTime != nil {
		projected.Status.StartTime = pod.Status.StartTime.DeepCopy()
	}
	return projected, nil
}

func transformPersistentVolumeClaim(obj any) (any, error) {
	pvc, ok := obj.(*corev1.PersistentVolumeClaim)
	if !ok {
		return obj, nil
	}

	metadata := projectObjectMeta(pvc.ObjectMeta)
	metadata.Labels = resourceLabels(pvc.Labels)
	if len(pvc.OwnerReferences) > 0 {
		metadata.OwnerReferences = []metav1.OwnerReference{{
			Kind: pvc.OwnerReferences[0].Kind,
		}}
	}
	requests := corev1.ResourceList{}
	if storage, ok := pvc.Spec.Resources.Requests[corev1.ResourceStorage]; ok {
		requests[corev1.ResourceStorage] = storage.DeepCopy()
	}
	return &corev1.PersistentVolumeClaim{
		TypeMeta:   pvc.TypeMeta,
		ObjectMeta: metadata,
		Spec: corev1.PersistentVolumeClaimSpec{
			Resources: corev1.VolumeResourceRequirements{Requests: requests},
		},
		Status: corev1.PersistentVolumeClaimStatus{
			Phase: pvc.Status.Phase,
		},
	}, nil
}

func transformBackup(obj any) (any, error) {
	backup, ok := obj.(*kbv1alpha1.Backup)
	if !ok {
		return obj, nil
	}

	metadata := projectObjectMeta(backup.ObjectMeta)
	metadata.Labels = resourceLabels(backup.Labels)
	return &kbv1alpha1.Backup{
		TypeMeta:   backup.TypeMeta,
		ObjectMeta: metadata,
		Status: kbv1alpha1.BackupStatus{
			Phase:     backup.Status.Phase,
			TotalSize: backup.Status.TotalSize,
		},
	}, nil
}

func transformService(obj any) (any, error) {
	service, ok := obj.(*corev1.Service)
	if !ok {
		return obj, nil
	}

	ports := make([]corev1.ServicePort, len(service.Spec.Ports))
	for i := range service.Spec.Ports {
		ports[i].NodePort = service.Spec.Ports[i].NodePort
	}
	metadata := projectObjectMeta(service.ObjectMeta)
	metadata.Labels = resourceLabels(service.Labels)
	if value, ok := service.Labels[originalNodePortLabelKey]; ok {
		if metadata.Labels == nil {
			metadata.Labels = make(map[string]string)
		}
		metadata.Labels[originalNodePortLabelKey] = value
	}
	return &corev1.Service{
		TypeMeta:   service.TypeMeta,
		ObjectMeta: metadata,
		Spec: corev1.ServiceSpec{
			Type:  service.Spec.Type,
			Ports: ports,
		},
	}, nil
}

func transformInstance(obj any) (any, error) {
	switch instance := obj.(type) {
	case *appv1.Instance:
		metadata := projectObjectMeta(instance.ObjectMeta)
		metadata.Labels = copyMapValues(instance.Labels, resources.AppStoreDeployLabelKey)
		return &appv1.Instance{
			TypeMeta:   instance.TypeMeta,
			ObjectMeta: metadata,
		}, nil
	case *metav1.PartialObjectMetadata:
		metadata := projectObjectMeta(instance.ObjectMeta)
		metadata.Labels = copyMapValues(instance.Labels, resources.AppStoreDeployLabelKey)
		return &metav1.PartialObjectMetadata{
			TypeMeta:   instance.TypeMeta,
			ObjectMeta: metadata,
		}, nil
	default:
		return obj, nil
	}
}

func transformGPUConfigMap(obj any) (any, error) {
	configMap, ok := obj.(*corev1.ConfigMap)
	if !ok {
		return obj, nil
	}

	return &corev1.ConfigMap{
		TypeMeta:   configMap.TypeMeta,
		ObjectMeta: projectObjectMeta(configMap.ObjectMeta),
		Data: copyMapValues(
			configMap.Data,
			gpuAliasConfigKey,
			gpuInfoConfigKey,
		),
	}, nil
}

func resourceLabels(source map[string]string) map[string]string {
	return copyMapValues(
		source,
		resources.DBPodLabelInstanceKey,
		resources.DBPodLabelComponentNameKey,
		resources.TerminalIDLabelKey,
		label.AppManagedBy,
		label.AppPartOf,
		label.AppName,
		resources.AppLabelKey,
		resources.AppDeployLabelKey,
		resources.JobNameLabelKey,
		resources.ACMEChallengeKey,
		backupRepositoryLabelKey,
		resources.InstanceLabelKey,
	)
}

func copyResourceList(source corev1.ResourceList) corev1.ResourceList {
	if len(source) == 0 {
		return nil
	}
	result := make(corev1.ResourceList, len(source))
	for name, quantity := range source {
		result[name] = quantity.DeepCopy()
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

// Index field names shared with the monitor reconciler.
const (
	PersistentVolumeClaimPhaseKey = persistentVolumeClaimPhaseKey
	BackupPhaseKey                = backupPhaseKey
	ServiceTypeKey                = serviceTypeKey
)
