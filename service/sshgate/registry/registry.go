package registry

import (
	"bytes"
	"fmt"
	"sync"

	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// DevboxPublicKeyField is the secret data field containing the public key
	DevboxPublicKeyField = "SEALOS_DEVBOX_PUBLIC_KEY"
	// DevboxPrivateKeyField is the secret data field containing the private key
	DevboxPrivateKeyField = "SEALOS_DEVBOX_PRIVATE_KEY"
	// DevboxPartOfLabel is the label key for identifying devbox resources
	DevboxPartOfLabel = "app.kubernetes.io/part-of"
	// DevboxPartOfValue is the expected label value for devbox resources
	DevboxPartOfValue = "devbox"
	// DevboxOwnerKind is the owner reference kind for devbox resources
	DevboxOwnerKind = "Devbox"
)

// DevboxInfo stores information about a devbox
type DevboxInfo struct {
	Namespace  string
	DevboxName string
	PodIP      string
	PublicKey  ssh.PublicKey
	PrivateKey ssh.Signer
}

// Registry manages the mapping between SSH public keys and devbox pods
type Registry struct {
	mu sync.RWMutex
	// publicKey (string) -> namespace/devboxName
	publicKeyToNamespaceDevbox map[string]string
	// namespace/devboxName -> DevboxInfo
	devboxToInfo map[string]*DevboxInfo
	logger       *log.Entry
}

// New creates a new Registry instance
func New() *Registry {
	return &Registry{
		publicKeyToNamespaceDevbox: make(map[string]string),
		devboxToInfo:               make(map[string]*DevboxInfo),
		logger:                     log.WithField("component", "registry"),
	}
}

// AddSecret processes a Secret and adds it to the registry.
// If old is provided, it will clean up stale data from the old secret.
func (r *Registry) AddSecret(oldSecret, newSecret *corev1.Secret) error {
	// Check if this is a devbox secret
	if newSecret.Labels[DevboxPartOfLabel] != DevboxPartOfValue {
		return nil
	}

	// Get public key from secret
	publicKeyData, ok := newSecret.Data[DevboxPublicKeyField]
	if !ok {
		return fmt.Errorf(
			"secret %s/%s missing %s",
			newSecret.Namespace,
			newSecret.Name,
			DevboxPublicKeyField,
		)
	}

	// Get first line of public key data
	firstLine := bytes.SplitN(publicKeyData, []byte("\n"), 2)[0]

	// Parse public key
	publicKey, _, _, _, err := ssh.ParseAuthorizedKey(firstLine)
	if err != nil {
		return fmt.Errorf("failed to parse public key: %w", err)
	}

	// Get devbox name from ownerReferences
	devboxName := getDevboxNameFromOwnerReferences(newSecret.OwnerReferences)
	if devboxName == "" {
		return fmt.Errorf("secret %s/%s has no Devbox owner", newSecret.Namespace, newSecret.Name)
	}

	// Parse private key if available
	var privateKey ssh.Signer
	if privateKeyData, ok := newSecret.Data[DevboxPrivateKeyField]; ok {
		privateKey, err = ssh.ParsePrivateKey(privateKeyData)
		if err != nil {
			r.logger.WithFields(log.Fields{
				"namespace": newSecret.Namespace,
				"devbox":    devboxName,
			}).WithError(err).Warn("Failed to parse private key")
		}
	}

	devboxKey := fmt.Sprintf("%s/%s", newSecret.Namespace, devboxName)
	pubKeyStr := string(publicKey.Marshal())

	r.logger.WithFields(log.Fields{
		"namespace": newSecret.Namespace,
		"devbox":    devboxName,
	}).Info("Adding secret")

	r.mu.Lock()
	defer r.mu.Unlock()

	// Clean up old public key mapping if old secret provided
	if oldSecret != nil {
		if oldKeyData, ok := oldSecret.Data[DevboxPublicKeyField]; ok {
			oldFirstLine := bytes.SplitN(oldKeyData, []byte("\n"), 2)[0]
			if oldPubKey, _, _, _, err := ssh.ParseAuthorizedKey(oldFirstLine); err == nil {
				oldPubKeyStr := string(oldPubKey.Marshal())
				if oldPubKeyStr != pubKeyStr {
					delete(r.publicKeyToNamespaceDevbox, oldPubKeyStr)
				}
			}
		}
	}

	info, exists := r.devboxToInfo[devboxKey]
	if !exists {
		info = &DevboxInfo{
			Namespace:  newSecret.Namespace,
			DevboxName: devboxName,
		}
		r.devboxToInfo[devboxKey] = info
	}

	info.PublicKey = publicKey
	info.PrivateKey = privateKey
	r.publicKeyToNamespaceDevbox[pubKeyStr] = devboxKey

	return nil
}

// DeleteSecret removes a Secret from the registry
func (r *Registry) DeleteSecret(secret *corev1.Secret) {
	devboxName := getDevboxNameFromOwnerReferences(secret.OwnerReferences)
	if devboxName == "" {
		return
	}

	key := fmt.Sprintf("%s/%s", secret.Namespace, devboxName)
	r.logger.WithFields(log.Fields{
		"namespace": secret.Namespace,
		"devbox":    devboxName,
	}).Info("Removing secret")

	r.mu.Lock()
	defer r.mu.Unlock()

	if info, ok := r.devboxToInfo[key]; ok {
		if info.PublicKey != nil {
			delete(r.publicKeyToNamespaceDevbox, string(info.PublicKey.Marshal()))
		}

		delete(r.devboxToInfo, key)
	}
}

// UpdatePod updates the pod IP for a devbox.
func (r *Registry) UpdatePod(pod *corev1.Pod) error {
	// Check if this is a devbox pod
	if pod.Labels[DevboxPartOfLabel] != DevboxPartOfValue {
		return nil
	}

	// Get devbox name from ownerReferences
	devboxName := getDevboxNameFromOwnerReferences(pod.OwnerReferences)
	if devboxName == "" {
		return fmt.Errorf("pod %s/%s has no Devbox owner", pod.Namespace, pod.Name)
	}

	key := fmt.Sprintf("%s/%s", pod.Namespace, devboxName)

	r.logger.WithFields(log.Fields{
		"namespace": pod.Namespace,
		"devbox":    devboxName,
		"pod_ip":    pod.Status.PodIP,
	}).Info("Updating pod IP")

	r.mu.Lock()
	defer r.mu.Unlock()

	info, exists := r.devboxToInfo[key]
	if !exists {
		info = &DevboxInfo{
			Namespace:  pod.Namespace,
			DevboxName: devboxName,
		}
		r.devboxToInfo[key] = info
	}

	// Update PodIP even if empty (pod may be restarting)
	info.PodIP = pod.Status.PodIP

	return nil
}

// DeletePod removes a pod from the registry
func (r *Registry) DeletePod(pod *corev1.Pod) {
	devboxName := getDevboxNameFromOwnerReferences(pod.OwnerReferences)
	if devboxName == "" {
		return
	}

	key := fmt.Sprintf("%s/%s", pod.Namespace, devboxName)
	r.logger.WithFields(log.Fields{
		"namespace": pod.Namespace,
		"devbox":    devboxName,
	}).Info("Removing pod IP")

	r.mu.Lock()
	defer r.mu.Unlock()

	if info, ok := r.devboxToInfo[key]; ok {
		info.PodIP = ""
	}
}

// GetByPublicKey retrieves DevboxInfo by SSH public key
func (r *Registry) GetByPublicKey(publicKey ssh.PublicKey) (*DevboxInfo, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	key, ok := r.publicKeyToNamespaceDevbox[string(publicKey.Marshal())]
	if !ok {
		return nil, false
	}

	info, ok := r.devboxToInfo[key]

	return info, ok
}

// GetDevboxInfo retrieves DevboxInfo by namespace and devbox name
func (r *Registry) GetDevboxInfo(namespace, devboxName string) (*DevboxInfo, bool) {
	key := fmt.Sprintf("%s/%s", namespace, devboxName)

	r.mu.RLock()
	defer r.mu.RUnlock()

	info, ok := r.devboxToInfo[key]

	return info, ok
}

func getDevboxNameFromOwnerReferences(refs []metav1.OwnerReference) string {
	for _, ref := range refs {
		if ref.Kind == DevboxOwnerKind {
			return ref.Name
		}
	}

	return ""
}
