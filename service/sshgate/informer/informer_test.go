package informer_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"
	"testing"
	"time"

	"github.com/labring/sealos/service/sshgate/informer"
	"github.com/labring/sealos/service/sshgate/registry"
	"golang.org/x/crypto/ssh"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func generateTestKeys(t *testing.T) ([]byte, []byte) {
	t.Helper()

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	sshPub, err := ssh.NewPublicKey(pub)
	if err != nil {
		t.Fatalf("Failed to create SSH public key: %v", err)
	}

	pubBytes := ssh.MarshalAuthorizedKey(sshPub)

	privPEM, err := ssh.MarshalPrivateKey(priv, "")
	if err != nil {
		t.Fatalf("Failed to marshal private key: %v", err)
	}

	privBytes := pem.EncodeToMemory(privPEM)

	return pubBytes, privBytes
}

func TestNew(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()

	mgr := informer.New(clientset, reg)

	if mgr == nil {
		t.Fatal("New() returned nil")
	}
}

func TestProcessSecretAdd(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()
	mgr := informer.New(clientset, reg)

	pubBytes, privBytes := generateTestKeys(t)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Data: map[string][]byte{
			registry.DevboxPublicKeyField:  pubBytes,
			registry.DevboxPrivateKeyField: privBytes,
		},
	}

	// Process secret add
	if err := mgr.ProcessSecret(secret, "add"); err != nil {
		t.Fatalf("ProcessSecret failed: %v", err)
	}

	// Verify secret was added to registry
	pubKey, _, _, _, _ := ssh.ParseAuthorizedKey(pubBytes)

	info, ok := reg.GetByPublicKey(pubKey)
	if !ok {
		t.Fatal("Secret was not added to registry")
	}

	if info.DevboxName != "test-devbox" {
		t.Errorf("DevboxName = %s, want test-devbox", info.DevboxName)
	}
}

func TestProcessSecretUpdate(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()
	mgr := informer.New(clientset, reg)

	pubBytes, privBytes := generateTestKeys(t)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Data: map[string][]byte{
			registry.DevboxPublicKeyField:  pubBytes,
			registry.DevboxPrivateKeyField: privBytes,
		},
	}

	// Process secret update
	if err := mgr.ProcessSecret(secret, "update"); err != nil {
		t.Fatalf("ProcessSecret failed: %v", err)
	}

	// Verify secret was updated in registry
	pubKey, _, _, _, _ := ssh.ParseAuthorizedKey(pubBytes)

	_, ok := reg.GetByPublicKey(pubKey)
	if !ok {
		t.Fatal("Secret was not updated in registry")
	}
}

func TestProcessSecretDelete(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()
	mgr := informer.New(clientset, reg)

	pubBytes, privBytes := generateTestKeys(t)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Data: map[string][]byte{
			registry.DevboxPublicKeyField:  pubBytes,
			registry.DevboxPrivateKeyField: privBytes,
		},
	}

	// Add first
	if err := mgr.ProcessSecret(secret, "add"); err != nil {
		t.Fatalf("ProcessSecret failed: %v", err)
	}

	pubKey, _, _, _, _ := ssh.ParseAuthorizedKey(pubBytes)

	// Verify it exists
	_, ok := reg.GetByPublicKey(pubKey)
	if !ok {
		t.Fatal("Secret was not added")
	}

	// Delete
	if err := mgr.ProcessSecret(secret, "delete"); err != nil {
		t.Fatalf("ProcessSecret failed: %v", err)
	}

	// Verify it's deleted
	_, ok = reg.GetByPublicKey(pubKey)
	if ok {
		t.Error("Secret was not deleted from registry")
	}
}

func TestProcessPodAdd(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()
	mgr := informer.New(clientset, reg)

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Status: corev1.PodStatus{
			PodIP: "10.0.0.1",
		},
	}

	// Process pod add
	if err := mgr.ProcessPod(pod, "add"); err != nil {
		t.Fatalf("ProcessPod failed: %v", err)
	}

	// Verify pod was added
	info, ok := reg.GetDevboxInfo("test-ns", "test-devbox")
	if !ok {
		t.Fatal("DevboxInfo not found after ProcessPod")
	}

	if info.PodIP != "10.0.0.1" {
		t.Errorf("PodIP = %s, want 10.0.0.1", info.PodIP)
	}
}

func TestProcessPodUpdate(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()
	mgr := informer.New(clientset, reg)

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Status: corev1.PodStatus{
			PodIP: "10.0.0.2",
		},
	}

	// Process pod update
	if err := mgr.ProcessPod(pod, "update"); err != nil {
		t.Fatalf("ProcessPod failed: %v", err)
	}

	// Verify pod was updated
	info, ok := reg.GetDevboxInfo("test-ns", "test-devbox")
	if !ok {
		t.Fatal("DevboxInfo not found after ProcessPod")
	}

	if info.PodIP != "10.0.0.2" {
		t.Errorf("PodIP = %s, want 10.0.0.2", info.PodIP)
	}
}

func TestStart(t *testing.T) {
	// Create fake clientset with reactor for list operations
	clientset := fake.NewSimpleClientset()

	// Add reactor to handle list operations
	clientset.PrependReactor(
		"list",
		"secrets",
		func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &corev1.SecretList{}, nil
		},
	)
	clientset.PrependReactor(
		"list",
		"pods",
		func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &corev1.PodList{}, nil
		},
	)

	reg := registry.New()
	mgr := informer.New(clientset, reg)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Start in goroutine
	errCh := make(chan error, 1)
	go func() {
		errCh <- mgr.Start(ctx)
	}()

	// Wait for start to complete or timeout
	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("Start() failed: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Error("Start() timed out")
	}

	// Verify manager is started
	if !mgr.IsStarted() {
		t.Error("Manager not started after Start()")
	}
}

func TestStop(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	reg := registry.New()
	mgr := informer.New(clientset, reg)

	// Test that Stop doesn't panic when manager is not started
	mgr.Stop()

	// Start the manager
	ctx := context.Background()

	if err := mgr.Start(ctx); err != nil {
		t.Fatalf("Failed to start manager: %v", err)
	}

	// Test that Stop doesn't panic when manager is started
	mgr.Stop()

	// Test that multiple Stop calls don't panic
	mgr.Stop()
}

func TestStartWithExistingResources(t *testing.T) {
	// Test that manager can handle pre-existing resources
	pubBytes, privBytes := generateTestKeys(t)
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "default",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Data: map[string][]byte{
			registry.DevboxPublicKeyField:  pubBytes,
			registry.DevboxPrivateKeyField: privBytes,
		},
	}

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "default",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					Kind: registry.DevboxOwnerKind,
					Name: "test-devbox",
				},
			},
		},
		Status: corev1.PodStatus{
			PodIP: "10.0.0.1",
		},
	}

	// Create clientset with pre-existing resources
	clientset := fake.NewSimpleClientset(secret, pod)

	// Add reactors for list operations
	clientset.PrependReactor(
		"list",
		"secrets",
		func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &corev1.SecretList{Items: []corev1.Secret{*secret}}, nil
		},
	)
	clientset.PrependReactor(
		"list",
		"pods",
		func(action k8stesting.Action) (bool, runtime.Object, error) {
			return true, &corev1.PodList{Items: []corev1.Pod{*pod}}, nil
		},
	)

	reg := registry.New()
	mgr := informer.New(clientset, reg)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Start manager
	err := mgr.Start(ctx)
	if err != nil {
		t.Errorf("Start() failed: %v", err)
	}

	// Verify manager is started
	if !mgr.IsStarted() {
		t.Error("Manager not started after Start()")
	}
}
