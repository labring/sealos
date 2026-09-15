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
	"reflect"
	"testing"

	kbv1alpha1 "github.com/apecloud/kubeblocks/apis/dataprotection/v1alpha1"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	"github.com/labring/sealos/controllers/pkg/gpu"
	"github.com/labring/sealos/controllers/pkg/resources"
	accounttypes "github.com/labring/sealos/controllers/pkg/types"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func TestOptionsRegistersOnlyMonitorObjects(t *testing.T) {
	options := Options()
	if !options.ReaderFailOnMissingInformer {
		t.Fatal("missing informer reads are allowed")
	}
	if options.DefaultTransform == nil {
		t.Fatal("default managed fields transform is nil")
	}

	required := []client.Object{
		&corev1.Namespace{},
		&corev1.Pod{},
		&corev1.PersistentVolumeClaim{},
		&kbv1alpha1.Backup{},
		&corev1.Service{},
		&appv1.Instance{},
		&corev1.ConfigMap{},
	}
	if len(options.ByObject) != len(required) {
		t.Fatalf("cache object count = %d, want %d", len(options.ByObject), len(required))
	}
	for _, expected := range required {
		found := false
		for obj, byObject := range options.ByObject {
			if reflect.TypeOf(obj) != reflect.TypeOf(expected) {
				continue
			}
			found = true
			if byObject.Transform == nil {
				t.Fatalf("%T transform is nil", expected)
			}
		}
		if !found {
			t.Fatalf("%T cache options not found", expected)
		}
	}
}

func TestUncachedObjectsProtectProjectedWrites(t *testing.T) {
	disabled := UncachedObjects()
	if len(disabled) != len(Options().ByObject) {
		t.Fatalf("uncached object count = %d, want %d", len(disabled), len(Options().ByObject))
	}
	for cached := range Options().ByObject {
		found := false
		for _, object := range disabled {
			if reflect.TypeOf(cached) == reflect.TypeOf(object) {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("projected %T is not disabled on the general client", cached)
		}
	}
}

func TestOptionsLimitsGPUConfigMapCache(t *testing.T) {
	options := Options()
	for obj, byObject := range options.ByObject {
		if _, ok := obj.(*corev1.ConfigMap); !ok {
			continue
		}
		if len(byObject.Namespaces) != 1 {
			t.Fatalf("configmap cache namespaces = %d, want 1", len(byObject.Namespaces))
		}
		config, ok := byObject.Namespaces[gpu.NodeInfoConfigmapNamespace]
		if !ok {
			t.Fatalf("configmap cache does not include %q", gpu.NodeInfoConfigmapNamespace)
		}
		if got, want := config.FieldSelector.String(), "metadata.name="+gpu.NodeInfoConfigmapName; got != want {
			t.Fatalf("configmap field selector = %q, want %q", got, want)
		}
		return
	}
	t.Fatal("configmap cache options not found")
}

func TestTransformNamespaceKeepsMonitorSelectionFields(t *testing.T) {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "ns-user-a",
			ResourceVersion: "42",
			Labels: map[string]string{
				userv1.UserLabelOwnerKey: "user-a",
				"unused":                 "large-value",
			},
			Annotations: map[string]string{
				accounttypes.DebtNamespaceAnnoStatusKey:         accounttypes.SuspendDebtNamespaceAnnoStatus,
				accounttypes.WorkspaceSubscriptionStatusAnnoKey: "active",
				networkStatusAnnotationKey:                      "Suspend",
				"unused":                                        "large-value",
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: corev1.NamespaceSpec{Finalizers: []corev1.FinalizerName{"kubernetes"}},
	}

	transformed, err := transformNamespace(ns)
	if err != nil {
		t.Fatalf("transform namespace: %v", err)
	}
	got, ok := transformed.(*corev1.Namespace)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.Namespace", transformed)
	}
	if got.Name != ns.Name || got.ResourceVersion != ns.ResourceVersion {
		t.Fatalf("required identity metadata was not retained: %#v", got.ObjectMeta)
	}
	if !reflect.DeepEqual(got.Labels, map[string]string{userv1.UserLabelOwnerKey: "user-a"}) {
		t.Fatalf("namespace labels = %#v", got.Labels)
	}
	if !reflect.DeepEqual(got.Annotations, map[string]string{
		accounttypes.DebtNamespaceAnnoStatusKey:         accounttypes.SuspendDebtNamespaceAnnoStatus,
		accounttypes.WorkspaceSubscriptionStatusAnnoKey: "active",
		networkStatusAnnotationKey:                      "Suspend",
	}) {
		t.Fatalf("namespace annotations = %#v", got.Annotations)
	}
	if len(got.ManagedFields) != 0 || len(got.Spec.Finalizers) != 0 {
		t.Fatalf("unused namespace payload was retained: %#v", got)
	}
}

func TestTransformPodKeepsResourceAccountingFields(t *testing.T) {
	startTime := metav1.Now()
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "app-a-0",
			Namespace: "ns-user-a",
			Labels: map[string]string{
				resources.AppLabelKey: "app-a",
				"unused":              "large-value",
			},
			Annotations:   map[string]string{"unused": "large-value"},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: corev1.PodSpec{
			NodeName: "node-a",
			Containers: []corev1.Container{
				{
					Name:  "app",
					Image: "large-image-name",
					Args:  []string{"unused", "arguments"},
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceCPU: resource.MustParse("500m"),
						},
						Limits: corev1.ResourceList{
							corev1.ResourceMemory: resource.MustParse("1Gi"),
						},
						Claims: []corev1.ResourceClaim{{Name: "unused-claim"}},
					},
				},
				{
					Name: "acmesolver",
					Args: []string{"--domain=example.test"},
				},
			},
		},
		Status: corev1.PodStatus{
			Phase:     corev1.PodRunning,
			StartTime: &startTime,
			PodIP:     "10.0.0.1",
		},
	}

	transformed, err := transformPod(pod)
	if err != nil {
		t.Fatalf("transform pod: %v", err)
	}
	got, ok := transformed.(*corev1.Pod)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.Pod", transformed)
	}
	if got.Spec.NodeName != pod.Spec.NodeName || got.Status.Phase != pod.Status.Phase ||
		got.Status.StartTime == nil || !got.Status.StartTime.Equal(pod.Status.StartTime) {
		t.Fatalf("pod scheduling fields were not retained: %#v", got)
	}
	if got.Spec.Containers[0].Resources.Requests.Cpu().String() != "500m" ||
		got.Spec.Containers[0].Resources.Limits.Memory().String() != "1Gi" {
		t.Fatalf("pod resources were not retained: %#v", got.Spec.Containers[0].Resources)
	}
	if len(got.Spec.Containers[0].Args) != 0 || got.Spec.Containers[0].Image != "" ||
		len(got.Spec.Containers[0].Resources.Claims) != 0 ||
		!reflect.DeepEqual(got.Spec.Containers[1].Args, []string{"--domain=example.test"}) {
		t.Fatalf("pod container projection is incorrect: %#v", got.Spec.Containers)
	}
	if got.Status.PodIP != "" || len(got.Annotations) != 0 || len(got.ManagedFields) != 0 {
		t.Fatalf("unused pod payload was retained: %#v", got)
	}
	if named := resources.NewResourceNamed(got); named.Name() != "app-a" {
		t.Fatalf("resource name = %q, want app-a", named.Name())
	}
}

func TestTransformPersistentVolumeClaimKeepsIndexAndStorage(t *testing.T) {
	pvc := &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "data-app-a",
			Namespace: "ns-user-a",
			Labels:    map[string]string{resources.AppLabelKey: "app-a", "unused": "value"},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: "StatefulSet", Name: "app-a", UID: types.UID("owner-a")},
				{Kind: "Other", Name: "unused"},
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			VolumeName: "large-volume-name",
			Resources: corev1.VolumeResourceRequirements{Requests: corev1.ResourceList{
				corev1.ResourceStorage: resource.MustParse("20Gi"),
				corev1.ResourceCPU:     resource.MustParse("1"),
			}},
		},
		Status: corev1.PersistentVolumeClaimStatus{
			Phase:    corev1.ClaimBound,
			Capacity: corev1.ResourceList{corev1.ResourceStorage: resource.MustParse("20Gi")},
		},
	}

	transformed, err := transformPersistentVolumeClaim(pvc)
	if err != nil {
		t.Fatalf("transform pvc: %v", err)
	}
	got, ok := transformed.(*corev1.PersistentVolumeClaim)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.PersistentVolumeClaim", transformed)
	}
	if got.Status.Phase != corev1.ClaimBound ||
		got.Spec.Resources.Requests.Storage().String() != "20Gi" {
		t.Fatalf("pvc accounting fields were not retained: %#v", got)
	}
	if len(got.OwnerReferences) != 1 || got.OwnerReferences[0].Kind != "StatefulSet" ||
		got.OwnerReferences[0].Name != "" {
		t.Fatalf("pvc owner projection = %#v", got.OwnerReferences)
	}
	if got.Spec.VolumeName != "" || len(got.Status.Capacity) != 0 ||
		got.Spec.Resources.Requests.Cpu().Sign() != 0 || len(got.ManagedFields) != 0 {
		t.Fatalf("unused pvc payload was retained: %#v", got)
	}
}

func TestTransformBackupAndServiceKeepAccountingFields(t *testing.T) {
	backup := &kbv1alpha1.Backup{
		ObjectMeta: metav1.ObjectMeta{
			Name: "backup-a",
			Labels: map[string]string{
				resources.InstanceLabelKey: "database-a",
				"unused":                   "value",
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Status: kbv1alpha1.BackupStatus{
			Phase:         kbv1alpha1.BackupPhaseCompleted,
			TotalSize:     "2Gi",
			FailureReason: "unused-large-value",
		},
	}
	transformedBackup, err := transformBackup(backup)
	if err != nil {
		t.Fatalf("transform backup: %v", err)
	}
	gotBackup, ok := transformedBackup.(*kbv1alpha1.Backup)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1alpha1.Backup", transformedBackup)
	}
	if gotBackup.Status.Phase != backup.Status.Phase || gotBackup.Status.TotalSize != "2Gi" ||
		gotBackup.Status.FailureReason != "" || len(gotBackup.ManagedFields) != 0 {
		t.Fatalf("backup projection is incorrect: %#v", gotBackup)
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name: "app-a",
			Labels: map[string]string{
				resources.AppLabelKey:    "app-a",
				originalNodePortLabelKey: "true",
				"unused":                 "value",
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: corev1.ServiceSpec{
			Type:      corev1.ServiceTypeNodePort,
			ClusterIP: "10.96.0.1",
			Selector:  map[string]string{"large": "selector"},
			Ports: []corev1.ServicePort{
				{Name: "http", Port: 80, NodePort: 30080},
				{Name: "https", Port: 443, NodePort: 30443},
			},
		},
	}
	transformedService, err := transformService(service)
	if err != nil {
		t.Fatalf("transform service: %v", err)
	}
	gotService, ok := transformedService.(*corev1.Service)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.Service", transformedService)
	}
	if gotService.Spec.Type != corev1.ServiceTypeNodePort ||
		gotService.Spec.Ports[0].NodePort != 30080 || gotService.Spec.Ports[1].NodePort != 30443 {
		t.Fatalf("service accounting fields were not retained: %#v", gotService.Spec)
	}
	if gotService.Labels[originalNodePortLabelKey] != "true" {
		t.Fatalf("service network label was not retained: %#v", gotService.Labels)
	}
	if gotService.Spec.ClusterIP != "" || len(gotService.Spec.Selector) != 0 ||
		gotService.Spec.Ports[0].Name != "" || gotService.Spec.Ports[0].Port != 0 ||
		len(gotService.ManagedFields) != 0 {
		t.Fatalf("unused service payload was retained: %#v", gotService)
	}
}

func TestTransformInstanceAndGPUConfigMap(t *testing.T) {
	instance := &appv1.Instance{
		ObjectMeta: metav1.ObjectMeta{
			Name: "instance-a",
			Labels: map[string]string{
				resources.AppStoreDeployLabelKey: "store-a",
				"unused":                         "value",
			},
			Annotations:   map[string]string{"unused": "value"},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
	}
	transformedInstance, err := transformInstance(instance)
	if err != nil {
		t.Fatalf("transform instance: %v", err)
	}
	gotInstance, ok := transformedInstance.(*appv1.Instance)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.Instance", transformedInstance)
	}
	if !reflect.DeepEqual(gotInstance.Labels, map[string]string{
		resources.AppStoreDeployLabelKey: "store-a",
	}) || len(gotInstance.Annotations) != 0 || len(gotInstance.ManagedFields) != 0 {
		t.Fatalf("instance projection is incorrect: %#v", gotInstance)
	}
	instanceMetadata := &metav1.PartialObjectMetadata{
		ObjectMeta: instance.ObjectMeta,
	}
	instanceMetadata.SetGroupVersionKind(appv1.GroupVersion.WithKind("Instance"))
	transformedMetadata, err := transformInstance(instanceMetadata)
	if err != nil {
		t.Fatalf("transform instance metadata: %v", err)
	}
	gotMetadata, ok := transformedMetadata.(*metav1.PartialObjectMetadata)
	if !ok {
		t.Fatalf("transformed type = %T, want *metav1.PartialObjectMetadata", transformedMetadata)
	}
	if gotMetadata.GroupVersionKind() != instanceMetadata.GroupVersionKind() ||
		!reflect.DeepEqual(gotMetadata.Labels, gotInstance.Labels) ||
		len(gotMetadata.Annotations) != 0 || len(gotMetadata.ManagedFields) != 0 {
		t.Fatalf("instance metadata projection is incorrect: %#v", gotMetadata)
	}

	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:            gpu.NodeInfoConfigmapName,
			Namespace:       gpu.NodeInfoConfigmapNamespace,
			ManagedFields:   []metav1.ManagedFieldsEntry{{Manager: "test"}},
			ResourceVersion: "42",
		},
		Data: map[string]string{
			gpuAliasConfigKey: "alias-data",
			gpuInfoConfigKey:  "gpu-data",
			"unused":          "large-value",
		},
		BinaryData: map[string][]byte{"unused": []byte("large-value")},
	}
	transformedConfigMap, err := transformGPUConfigMap(configMap)
	if err != nil {
		t.Fatalf("transform configmap: %v", err)
	}
	gotConfigMap, ok := transformedConfigMap.(*corev1.ConfigMap)
	if !ok {
		t.Fatalf("transformed type = %T, want *v1.ConfigMap", transformedConfigMap)
	}
	if !reflect.DeepEqual(gotConfigMap.Data, map[string]string{
		gpuAliasConfigKey: "alias-data",
		gpuInfoConfigKey:  "gpu-data",
	}) || len(gotConfigMap.BinaryData) != 0 || len(gotConfigMap.ManagedFields) != 0 {
		t.Fatalf("configmap projection is incorrect: %#v", gotConfigMap)
	}
}
