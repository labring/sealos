package informer

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/service/sshgate/registry"
	log "github.com/sirupsen/logrus"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

// Manager manages Kubernetes informers for the gateway
type Manager struct {
	clientset    kubernetes.Interface
	registry     *registry.Registry
	resyncPeriod time.Duration
	factory      informers.SharedInformerFactory
	cancel       context.CancelFunc
	logger       *log.Entry
}

// Option configures the informer manager
type Option func(*Manager)

// WithResyncPeriod sets the resync period for the informers
func WithResyncPeriod(d time.Duration) Option {
	return func(m *Manager) {
		m.resyncPeriod = d
	}
}

// New creates a new informer manager
func New(clientset kubernetes.Interface, reg *registry.Registry, opts ...Option) *Manager {
	m := &Manager{
		clientset:    clientset,
		registry:     reg,
		resyncPeriod: 0, // Disable periodic resync, rely on Watch
		logger:       log.WithField("component", "informer"),
	}

	// Apply options
	for _, opt := range opts {
		opt(m)
	}

	return m
}

// Start initializes and starts all informers
func (m *Manager) Start(ctx context.Context) error {
	// Create a cancellable context for the informer lifecycle
	ctx, m.cancel = context.WithCancel(ctx)

	// Create informer factory with label selector to only watch devbox resources
	m.factory = informers.NewSharedInformerFactoryWithOptions(
		m.clientset,
		m.resyncPeriod,
		informers.WithTweakListOptions(func(opts *metav1.ListOptions) {
			opts.LabelSelector = registry.DevboxPartOfLabel + "=" + registry.DevboxPartOfValue
		}),
	)

	// Setup secret informer with transform to minimize memory usage
	secretInformer := m.factory.Core().V1().Secrets().Informer()

	// Transform secret to only keep required fields
	if err := secretInformer.SetTransform(transformSecret); err != nil {
		return fmt.Errorf("failed to set secret transform: %w", err)
	}

	_, err := secretInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    m.handleSecretAdd,
		UpdateFunc: m.handleSecretUpdate,
		DeleteFunc: m.handleSecretDelete,
	})
	if err != nil {
		return err
	}

	// Setup pod informer with transform to minimize memory usage
	podInformer := m.factory.Core().V1().Pods().Informer()

	// Transform pod to only keep required fields
	if err := podInformer.SetTransform(transformPod); err != nil {
		return fmt.Errorf("failed to set pod transform: %w", err)
	}

	_, err = podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    m.handlePodAdd,
		UpdateFunc: m.handlePodUpdate,
		DeleteFunc: m.handlePodDelete,
	})
	if err != nil {
		return err
	}

	// Start informers
	m.factory.Start(ctx.Done())

	// Wait for cache sync
	if !cache.WaitForCacheSync(ctx.Done(), secretInformer.HasSynced, podInformer.HasSynced) {
		return ErrCacheSyncFailed
	}

	m.logger.Info("Informers synced successfully")

	return nil
}

// Stop stops all informers
func (m *Manager) Stop() {
	if m.cancel != nil {
		m.cancel()
		m.cancel = nil
	}

	if m.factory != nil {
		m.factory.Shutdown()
	}
}

// IsStarted returns true if the manager has been started and factory is initialized
func (m *Manager) IsStarted() bool {
	return m.factory != nil
}

// ProcessSecret processes a secret (for testing)
func (m *Manager) ProcessSecret(secret *corev1.Secret, action string) error {
	switch action {
	case "add":
		m.handleSecretAdd(secret)
	case "update":
		m.handleSecretUpdate(nil, secret)
	case "delete":
		m.handleSecretDelete(secret)
	default:
		return fmt.Errorf("unknown action: %s", action)
	}

	return nil
}

// ProcessPod processes a pod (for testing)
func (m *Manager) ProcessPod(pod *corev1.Pod, action string) error {
	switch action {
	case "add", "update":
		m.handlePodAdd(pod)
	case "delete":
		m.handlePodDelete(pod)
	default:
		return fmt.Errorf("unknown action: %s", action)
	}

	return nil
}

// Event handlers for secrets
func (m *Manager) handleSecretAdd(obj any) {
	secret, ok := obj.(*corev1.Secret)
	if !ok {
		m.logger.WithField("type", fmt.Sprintf("%T", obj)).Error("Expected *corev1.Secret")
		return
	}

	if err := m.registry.AddSecret(nil, secret); err != nil {
		m.logger.WithError(err).Error("Error adding secret")
	}
}

func (m *Manager) handleSecretUpdate(oldObj, newObj any) {
	var oldSecret *corev1.Secret
	if oldObj != nil {
		var ok bool

		oldSecret, ok = oldObj.(*corev1.Secret)
		if !ok {
			m.logger.WithField("type", fmt.Sprintf("%T", oldObj)).
				Error("Expected *corev1.Secret for old object")
			return
		}
	}

	newSecret, ok := newObj.(*corev1.Secret)
	if !ok {
		m.logger.WithField("type", fmt.Sprintf("%T", newObj)).
			Error("Expected *corev1.Secret for new object")
		return
	}

	if err := m.registry.AddSecret(oldSecret, newSecret); err != nil {
		m.logger.WithError(err).Error("Error updating secret")
	}
}

func (m *Manager) handleSecretDelete(obj any) {
	secret, ok := obj.(*corev1.Secret)
	if !ok {
		m.logger.WithField("type", fmt.Sprintf("%T", obj)).Error("Expected *corev1.Secret")
		return
	}

	m.registry.DeleteSecret(secret)
}

// Event handlers for pods
func (m *Manager) handlePodAdd(obj any) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		m.logger.WithField("type", fmt.Sprintf("%T", obj)).Error("Expected *corev1.Pod")
		return
	}

	if err := m.registry.UpdatePod(pod); err != nil {
		m.logger.WithError(err).Error("Error adding pod")
	}
}

func (m *Manager) handlePodUpdate(_, newObj any) {
	pod, ok := newObj.(*corev1.Pod)
	if !ok {
		m.logger.WithField("type", fmt.Sprintf("%T", newObj)).Error("Expected *corev1.Pod")
		return
	}

	if err := m.registry.UpdatePod(pod); err != nil {
		m.logger.WithError(err).Error("Error updating pod")
	}
}

func (m *Manager) handlePodDelete(obj any) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		m.logger.WithField("type", fmt.Sprintf("%T", obj)).Error("Expected *corev1.Pod")
		return
	}

	m.registry.DeletePod(pod)
}

// transformSecret transforms a Secret to only keep required fields, reducing memory usage
func transformSecret(obj any) (any, error) {
	secret, ok := obj.(*corev1.Secret)
	if !ok {
		return nil, fmt.Errorf("expected *corev1.Secret, got %T", obj)
	}

	// Only keep required data fields
	minData := make(map[string][]byte, 2)
	if v, ok := secret.Data[registry.DevboxPublicKeyField]; ok {
		minData[registry.DevboxPublicKeyField] = v
	}
	if v, ok := secret.Data[registry.DevboxPrivateKeyField]; ok {
		minData[registry.DevboxPrivateKeyField] = v
	}

	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:            secret.Name,
			Namespace:       secret.Namespace,
			Labels:          secret.Labels,
			OwnerReferences: secret.OwnerReferences,
		},
		Data: minData,
	}, nil
}

// transformPod transforms a Pod to only keep required fields, reducing memory usage
func transformPod(obj any) (any, error) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return nil, fmt.Errorf("expected *corev1.Pod, got %T", obj)
	}

	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:            pod.Name,
			Namespace:       pod.Namespace,
			Labels:          pod.Labels,
			OwnerReferences: pod.OwnerReferences,
		},
		Status: corev1.PodStatus{
			PodIP: pod.Status.PodIP,
		},
	}, nil
}
