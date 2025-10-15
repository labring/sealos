package proxy

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"

	shimtypes "github.com/labring/image-cri-shim/pkg/types"
)

const (
	// Namespace holds the namespace where image-cri-shim resources reside.
	Namespace = "kube-system"
	// ConfigMapName is the name of the ConfigMap that keeps the shim configuration.
	ConfigMapName = "image-cri-shim"
	// DaemonSetName represents the DaemonSet delivering image-cri-shim.
	DaemonSetName = "image-cri-shim"
	// ContainerName is the preferred container name within the DaemonSet to mutate.
	ContainerName = "image-cri-shim"
	// ConfigVersionAnnotation tracks the requested shim version on objects.
	ConfigVersionAnnotation = "proxy.sealos.io/image-cri-shim-version"
	// DefaultImageRepository is the default image repository for shim upgrades.
	DefaultImageRepository = "ghcr.io/labring/sealos-image-cri-shim"
)

var configDataKeyCandidates = []string{"config.yaml", "image-cri-shim.yaml", "config"}

// Manager orchestrates read/write operations against the shim ConfigMap and DaemonSet.
type Manager struct {
	client  kubernetes.Interface
	cmKey   string
	cmCache *corev1.ConfigMap
}

// NewManager returns a new Manager backed by the provided clientset.
func NewManager(client kubernetes.Interface) *Manager {
	return &Manager{client: client}
}

// BuildImageReference builds the image reference for a given version.
func BuildImageReference(version string) string {
	trimmed := strings.TrimSpace(version)
	if trimmed == "" {
		return DefaultImageRepository
	}
	return fmt.Sprintf("%s:%s", DefaultImageRepository, trimmed)
}

func (m *Manager) loadConfigMap(ctx context.Context) (*corev1.ConfigMap, error) {
	if m.cmCache != nil {
		return m.cmCache.DeepCopy(), nil
	}
	cm, err := m.client.CoreV1().ConfigMaps(Namespace).Get(ctx, ConfigMapName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil, ErrNotInitialized
	}
	if err != nil {
		return nil, err
	}
	m.cmCache = cm.DeepCopy()
	return cm.DeepCopy(), nil
}

func (m *Manager) saveConfigMap(ctx context.Context, cm *corev1.ConfigMap) error {
	if cm == nil {
		return fmt.Errorf("configmap is nil")
	}
	out, err := m.client.CoreV1().ConfigMaps(cm.Namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if apierrors.IsNotFound(err) {
		return ErrNotInitialized
	}
	if err != nil {
		return err
	}
	m.cmCache = out.DeepCopy()
	return nil
}

func (m *Manager) resolveConfigData(cm *corev1.ConfigMap) (string, []byte, error) {
	if cm == nil {
		return "", nil, ErrConfigDataMissing
	}
	if m.cmKey != "" {
		if raw, ok := cm.Data[m.cmKey]; ok {
			return m.cmKey, []byte(raw), nil
		}
	}
	for _, key := range configDataKeyCandidates {
		if raw, ok := cm.Data[key]; ok {
			m.cmKey = key
			return key, []byte(raw), nil
		}
	}
	return "", nil, ErrConfigDataMissing
}

// GetConfig fetches and deserializes the shim configuration.
func (m *Manager) GetConfig(ctx context.Context) (*shimtypes.Config, error) {
	cm, err := m.loadConfigMap(ctx)
	if err != nil {
		return nil, err
	}
	_, data, err := m.resolveConfigData(cm)
	if err != nil {
		return nil, err
	}
	cfg, err := shimtypes.UnmarshalData(data)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidConfig, err)
	}
	return cfg, nil
}

// SaveConfig persists the provided configuration back into the ConfigMap.
func (m *Manager) SaveConfig(ctx context.Context, cfg *shimtypes.Config) error {
	if cfg == nil {
		return fmt.Errorf("config is nil")
	}
	cm, err := m.loadConfigMap(ctx)
	if err != nil {
		return err
	}
	key, _, err := m.resolveConfigData(cm)
	if err != nil {
		if errors.Is(err, ErrConfigDataMissing) {
			if cm.Data == nil {
				cm.Data = map[string]string{}
			}
			key = configDataKeyCandidates[0]
			m.cmKey = key
		} else {
			return err
		}
	}
	content, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	cm.Data[key] = string(content)
	return m.saveConfigMap(ctx, cm)
}

// ListRegistries returns a defensive copy of configured registries.
func (m *Manager) ListRegistries(ctx context.Context) ([]shimtypes.Registry, error) {
	cfg, err := m.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	registries := make([]shimtypes.Registry, len(cfg.Registries))
	copy(registries, cfg.Registries)
	sortRegistries(registries)
	return registries, nil
}

// AddOrUpdateRegistry inserts or replaces a registry entry by address.
func (m *Manager) AddOrUpdateRegistry(ctx context.Context, reg shimtypes.Registry) error {
	trimmed := strings.TrimSpace(reg.Address)
	if trimmed == "" {
		return ErrInvalidRegistryAddress
	}
	reg.Address = trimmed
	reg.Auth = strings.TrimSpace(reg.Auth)
	cfg, err := m.GetConfig(ctx)
	if err != nil {
		return err
	}
	updated := false
	for i := range cfg.Registries {
		if sameAddress(cfg.Registries[i].Address, reg.Address) {
			cfg.Registries[i] = reg
			updated = true
			break
		}
	}
	if !updated {
		cfg.Registries = append(cfg.Registries, reg)
	}
	sortRegistries(cfg.Registries)
	return m.SaveConfig(ctx, cfg)
}

// DeleteRegistry removes a registry entry by address.
func (m *Manager) DeleteRegistry(ctx context.Context, address string) error {
	trimmed := strings.TrimSpace(address)
	if trimmed == "" {
		return ErrInvalidRegistryAddress
	}
	cfg, err := m.GetConfig(ctx)
	if err != nil {
		return err
	}
	filtered := cfg.Registries[:0]
	removed := false
	for _, item := range cfg.Registries {
		if sameAddress(item.Address, trimmed) {
			removed = true
			continue
		}
		filtered = append(filtered, item)
	}
	if !removed {
		return ErrRegistryNotFound
	}
	cfg.Registries = filtered
	return m.SaveConfig(ctx, cfg)
}

// Upgrade updates the image-cri-shim DaemonSet image to the provided version and annotates resources.
func (m *Manager) Upgrade(ctx context.Context, version string) error {
	if _, err := m.GetConfig(ctx); err != nil {
		return err
	}
	daemonSet, err := m.client.AppsV1().DaemonSets(Namespace).Get(ctx, DaemonSetName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return ErrDaemonSetNotFound
	}
	if err != nil {
		return err
	}
	if len(daemonSet.Spec.Template.Spec.Containers) == 0 {
		return ErrDaemonSetInvalidContainer
	}
	image := BuildImageReference(version)
	applyImageToDaemonSet(daemonSet, image)
	setVersionAnnotation(&daemonSet.ObjectMeta, version)
	setVersionAnnotation(&daemonSet.Spec.Template.ObjectMeta, version)
	if _, err = m.client.AppsV1().DaemonSets(Namespace).Update(ctx, daemonSet, metav1.UpdateOptions{}); err != nil {
		return err
	}
	cm, err := m.loadConfigMap(ctx)
	if err != nil {
		return err
	}
	setVersionAnnotation(&cm.ObjectMeta, version)
	return m.saveConfigMap(ctx, cm)
}

func applyImageToDaemonSet(ds *appsv1.DaemonSet, image string) {
	for i := range ds.Spec.Template.Spec.Containers {
		container := &ds.Spec.Template.Spec.Containers[i]
		if container.Name == ContainerName {
			container.Image = image
			return
		}
	}
	// Fallback to the first container when no name matches.
	ds.Spec.Template.Spec.Containers[0].Image = image
}

func setVersionAnnotation(obj *metav1.ObjectMeta, version string) {
	if obj.Annotations == nil {
		obj.Annotations = map[string]string{}
	}
	obj.Annotations[ConfigVersionAnnotation] = strings.TrimSpace(version)
}

func sameAddress(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}

func sortRegistries(registries []shimtypes.Registry) {
	sort.SliceStable(registries, func(i, j int) bool {
		return strings.Compare(strings.ToLower(registries[i].Address), strings.ToLower(registries[j].Address)) < 0
	})
}
