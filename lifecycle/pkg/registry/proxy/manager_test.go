package proxy

import (
	"context"
	"errors"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	"sigs.k8s.io/yaml"

	shimtypes "github.com/labring/image-cri-shim/pkg/types"
)

func TestManagerConfigLifecycle(t *testing.T) {
	ctx := context.Background()
	initialConfig := &shimtypes.Config{
		Address:    "https://registry.example.com",
		Registries: []shimtypes.Registry{{Address: "https://mirror.example.com", Auth: "user:pass"}},
	}
	data, err := yaml.Marshal(initialConfig)
	if err != nil {
		t.Fatalf("marshal initial config: %v", err)
	}
	k8s := fake.NewSimpleClientset(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ConfigMapName,
			Namespace: Namespace,
		},
		Data: map[string]string{"config.yaml": string(data)},
	})
	mgr := NewManager(k8s)

	cfg, err := mgr.GetConfig(ctx)
	if err != nil {
		t.Fatalf("GetConfig failed: %v", err)
	}
	if got := len(cfg.Registries); got != 1 {
		t.Fatalf("expected 1 registry, got %d", got)
	}

	// add a new registry
	if err := mgr.AddOrUpdateRegistry(ctx, shimtypes.Registry{Address: "https://public.example.com"}); err != nil {
		t.Fatalf("AddOrUpdateRegistry failed: %v", err)
	}
	registries, err := mgr.ListRegistries(ctx)
	if err != nil {
		t.Fatalf("ListRegistries failed: %v", err)
	}
	if len(registries) != 2 {
		t.Fatalf("expected 2 registries after add, got %d", len(registries))
	}

	// update existing entry
	if err := mgr.AddOrUpdateRegistry(ctx, shimtypes.Registry{Address: "https://mirror.example.com", Auth: "user:changed"}); err != nil {
		t.Fatalf("update registry failed: %v", err)
	}
	registries, err = mgr.ListRegistries(ctx)
	if err != nil {
		t.Fatalf("ListRegistries after update failed: %v", err)
	}
	if registries[0].Address != "https://mirror.example.com" || registries[0].Auth != "user:changed" {
		t.Fatalf("expected updated credentials, got %+v", registries[0])
	}

	// delete entry
	if err := mgr.DeleteRegistry(ctx, "https://public.example.com"); err != nil {
		t.Fatalf("DeleteRegistry failed: %v", err)
	}
	registries, err = mgr.ListRegistries(ctx)
	if err != nil {
		t.Fatalf("ListRegistries after delete failed: %v", err)
	}
	if len(registries) != 1 {
		t.Fatalf("expected 1 registry after delete, got %d", len(registries))
	}
}

func TestManagerErrors(t *testing.T) {
	ctx := context.Background()
	mgr := NewManager(fake.NewSimpleClientset())
	if _, err := mgr.GetConfig(ctx); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected ErrNotInitialized, got %v", err)
	}
	if err := mgr.AddOrUpdateRegistry(ctx, shimtypes.Registry{Address: ""}); !errors.Is(err, ErrInvalidRegistryAddress) {
		t.Fatalf("expected ErrInvalidRegistryAddress, got %v", err)
	}
	if err := mgr.DeleteRegistry(ctx, "foo"); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("expected ErrNotInitialized on delete without config, got %v", err)
	}
}

func TestUpgrade(t *testing.T) {
	ctx := context.Background()
	config := &shimtypes.Config{Address: "https://registry.example.com"}
	data, err := yaml.Marshal(config)
	if err != nil {
		t.Fatalf("marshal config: %v", err)
	}
	k8s := fake.NewSimpleClientset(
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: ConfigMapName, Namespace: Namespace},
			Data:       map[string]string{"config.yaml": string(data)},
		},
		&appsv1.DaemonSet{
			ObjectMeta: metav1.ObjectMeta{Name: DaemonSetName, Namespace: Namespace},
			Spec: appsv1.DaemonSetSpec{
				Template: corev1.PodTemplateSpec{
					Spec: corev1.PodSpec{Containers: []corev1.Container{{Name: ContainerName, Image: "old"}}},
				},
			},
		},
	)
	mgr := NewManager(k8s)
	if err := mgr.Upgrade(ctx, "v5.1.0"); err != nil {
		t.Fatalf("Upgrade failed: %v", err)
	}
	updated, err := k8s.AppsV1().DaemonSets(Namespace).Get(ctx, DaemonSetName, metav1.GetOptions{})
	if err != nil {
		t.Fatalf("get updated daemonset failed: %v", err)
	}
	image := updated.Spec.Template.Spec.Containers[0].Image
	expectedImage := BuildImageReference("v5.1.0")
	if image != expectedImage {
		t.Fatalf("expected image %s, got %s", expectedImage, image)
	}
	if ann := updated.Annotations[ConfigVersionAnnotation]; ann != "v5.1.0" {
		t.Fatalf("expected annotation %s, got %s", "v5.1.0", ann)
	}
	cm, err := k8s.CoreV1().ConfigMaps(Namespace).Get(ctx, ConfigMapName, metav1.GetOptions{})
	if err != nil {
		t.Fatalf("get configmap failed: %v", err)
	}
	if cm.Annotations[ConfigVersionAnnotation] != "v5.1.0" {
		t.Fatalf("expected configmap annotation %s, got %s", "v5.1.0", cm.Annotations[ConfigVersionAnnotation])
	}
}
