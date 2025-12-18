package registry_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"
	"testing"

	"github.com/labring/sealos/service/sshgate/registry"
	"golang.org/x/crypto/ssh"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func generateTestKeyPair(t *testing.T) (ssh.PublicKey, []byte, []byte) {
	t.Helper()

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	sshPub, err := ssh.NewPublicKey(pub)
	if err != nil {
		t.Fatalf("Failed to create SSH public key: %v", err)
	}

	// Marshal keys for storage in secret
	pubBytes := ssh.MarshalAuthorizedKey(sshPub)

	privPEM, err := ssh.MarshalPrivateKey(priv, "")
	if err != nil {
		t.Fatalf("Failed to marshal private key: %v", err)
	}

	privBytes := pem.EncodeToMemory(privPEM)

	return sshPub, pubBytes, privBytes
}

func TestNew(t *testing.T) {
	r := registry.New()
	if r == nil {
		t.Fatal("New() returned nil")
	}
}

func TestAddSecret(t *testing.T) {
	r := registry.New()
	pubKey, pubBytes, privBytes := generateTestKeyPair(t)

	tests := []struct {
		name    string
		secret  *corev1.Secret
		wantErr bool
	}{
		{
			name: "valid secret",
			secret: &corev1.Secret{
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
			},
			wantErr: false,
		},
		{
			name: "secret without devbox label",
			secret: &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "other-secret",
					Namespace: "test-ns",
					Labels:    map[string]string{},
				},
			},
			wantErr: false, // Should skip without error
		},
		{
			name: "secret missing public key",
			secret: &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "bad-secret",
					Namespace: "test-ns",
					Labels: map[string]string{
						registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
					},
				},
				Data: map[string][]byte{},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := r.AddSecret(nil, tt.secret)
			if (err != nil) != tt.wantErr {
				t.Errorf("AddSecret() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}

	// Verify the valid secret was added
	info, ok := r.GetByPublicKey(pubKey)
	if !ok {
		t.Fatal("Failed to get devbox by public key")
	}

	if info.Namespace != "test-ns" {
		t.Errorf("Namespace = %s, want test-ns", info.Namespace)
	}

	if info.DevboxName != "test-devbox" {
		t.Errorf("DevboxName = %s, want test-devbox", info.DevboxName)
	}
}

func TestDeleteSecret(t *testing.T) {
	r := registry.New()
	_, pubBytes, privBytes := generateTestKeyPair(t)

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

	// Add secret
	if err := r.AddSecret(nil, secret); err != nil {
		t.Fatalf("Failed to add secret: %v", err)
	}

	// Delete secret
	r.DeleteSecret(secret)

	// Verify it's deleted
	pubKey, _, _, _, _ := ssh.ParseAuthorizedKey(pubBytes)
	if _, ok := r.GetByPublicKey(pubKey); ok {
		t.Error("Secret was not deleted from registry")
	}
}

func TestUpdatePod(t *testing.T) {
	r := registry.New()

	tests := []struct {
		name    string
		pod     *corev1.Pod
		wantErr bool
		wantIP  string
	}{
		{
			name: "valid pod with IP",
			pod: &corev1.Pod{
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
			},
			wantErr: false,
			wantIP:  "10.0.0.1",
		},
		{
			name: "pod without IP",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "pending-pod",
					Namespace: "test-ns",
					Labels: map[string]string{
						registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
					},
					OwnerReferences: []metav1.OwnerReference{
						{
							Kind: registry.DevboxOwnerKind,
							Name: "pending-devbox",
						},
					},
				},
				Status: corev1.PodStatus{
					PodIP: "",
				},
			},
			wantErr: false,
			wantIP:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := r.UpdatePod(tt.pod)
			if (err != nil) != tt.wantErr {
				t.Errorf("UpdatePod() error = %v, wantErr %v", err, tt.wantErr)
			}

			if tt.wantIP != "" {
				// Verify the pod IP was updated using public API
				info, ok := r.GetDevboxInfo("test-ns", "test-devbox")
				if !ok {
					t.Error("DevboxInfo not found after UpdatePod")
				} else if info.PodIP != tt.wantIP {
					t.Errorf("PodIP = %s, want %s", info.PodIP, tt.wantIP)
				}
			}
		})
	}
}

func TestGetByPublicKey(t *testing.T) {
	r := registry.New()
	pubKey, pubBytes, privBytes := generateTestKeyPair(t)

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

	if err := r.AddSecret(nil, secret); err != nil {
		t.Fatalf("Failed to add secret: %v", err)
	}

	// Test getting existing public key
	info, ok := r.GetByPublicKey(pubKey)
	if !ok {
		t.Fatal("GetByPublicKey() returned false for existing public key")
	}

	if info.DevboxName != "test-devbox" {
		t.Errorf("DevboxName = %s, want test-devbox", info.DevboxName)
	}

	// Test getting non-existent public key
	otherPubKey, _, _ := generateTestKeyPair(t)

	_, ok = r.GetByPublicKey(otherPubKey)
	if ok {
		t.Error("GetByPublicKey() returned true for non-existent public key")
	}
}

func TestConcurrentAccess(t *testing.T) {
	r := registry.New()
	_, pubBytes, privBytes := generateTestKeyPair(t)

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

	// Concurrent writes
	done := make(chan bool, 10)
	for range 10 {
		go func() {
			if err := r.AddSecret(nil, secret); err != nil {
				t.Errorf("AddSecret failed: %v", err)
			}

			done <- true
		}()
	}

	// Wait for all goroutines
	for range 10 {
		<-done
	}

	// Concurrent reads
	pubKey, _, _, _, _ := ssh.ParseAuthorizedKey(pubBytes)

	for range 10 {
		go func() {
			r.GetByPublicKey(pubKey)

			done <- true
		}()
	}

	for range 10 {
		<-done
	}
}
