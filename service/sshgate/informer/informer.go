package informer

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/service/sshgate/registry"
	log "github.com/sirupsen/logrus"
	corev1 "k8s.io/api/core/v1"
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
		resyncPeriod: 30 * time.Second, // Default value
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

	// Create informer factory
	m.factory = informers.NewSharedInformerFactory(m.clientset, m.resyncPeriod)

	// Setup secret informer
	secretInformer := m.factory.Core().V1().Secrets().Informer()

	_, err := secretInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    m.handleSecretAdd,
		UpdateFunc: m.handleSecretUpdate,
		DeleteFunc: m.handleSecretDelete,
	})
	if err != nil {
		return err
	}

	// Setup pod informer
	podInformer := m.factory.Core().V1().Pods().Informer()

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
