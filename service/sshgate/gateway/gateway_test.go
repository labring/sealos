package gateway_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"
	"net"
	"os"
	"testing"
	"time"

	"github.com/labring/sealos/service/sshgate/gateway"
	"github.com/labring/sealos/service/sshgate/logger"
	"github.com/labring/sealos/service/sshgate/registry"
	"golang.org/x/crypto/ssh"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestMain(m *testing.M) {
	// Initialize logger for tests
	logger.InitLog()
	os.Exit(m.Run())
}

func generateTestKeys(t *testing.T) (ssh.Signer, ssh.PublicKey, []byte, []byte) {
	t.Helper()

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}

	sshPub, err := ssh.NewPublicKey(pub)
	if err != nil {
		t.Fatalf("Failed to create SSH public key: %v", err)
	}

	sshPriv, err := ssh.NewSignerFromKey(priv)
	if err != nil {
		t.Fatalf("Failed to create SSH signer: %v", err)
	}

	pubBytes := ssh.MarshalAuthorizedKey(sshPub)

	privPEM, err := ssh.MarshalPrivateKey(priv, "")
	if err != nil {
		t.Fatalf("Failed to marshal private key: %v", err)
	}

	privBytes := pem.EncodeToMemory(privPEM)

	return sshPriv, sshPub, pubBytes, privBytes
}

func TestNew(t *testing.T) {
	hostKeySigner, _, _, _ := generateTestKeys(t)
	reg := registry.New()

	gw := gateway.New(hostKeySigner, reg)

	if gw == nil {
		t.Fatal("New() returned nil")
	}

	// Verify that Config is accessible
	sshConfig := gw.Config()
	if sshConfig == nil {
		t.Fatal("Config() returned nil")
	}

	// Verify that PublicKeyCallback is set
	if sshConfig.PublicKeyCallback == nil {
		t.Fatal("PublicKeyCallback is nil")
	}
}

// mockConnMetadata implements ssh.ConnMetadata for testing
type mockConnMetadata struct {
	user          string
	sessionID     []byte
	clientVersion []byte
	serverVersion []byte
	remoteAddr    net.Addr
	localAddr     net.Addr
}

func (m *mockConnMetadata) User() string          { return m.user }
func (m *mockConnMetadata) SessionID() []byte     { return m.sessionID }
func (m *mockConnMetadata) ClientVersion() []byte { return m.clientVersion }
func (m *mockConnMetadata) ServerVersion() []byte { return m.serverVersion }
func (m *mockConnMetadata) RemoteAddr() net.Addr  { return m.remoteAddr }
func (m *mockConnMetadata) LocalAddr() net.Addr   { return m.localAddr }

func newMockConnMetadata(username string) *mockConnMetadata {
	return &mockConnMetadata{
		user:          username,
		sessionID:     []byte("test-session"),
		clientVersion: []byte("SSH-2.0-Test"),
		serverVersion: []byte("SSH-2.0-Test"),
		remoteAddr:    &net.TCPAddr{IP: net.ParseIP("127.0.0.1"), Port: 12345},
		localAddr:     &net.TCPAddr{IP: net.ParseIP("127.0.0.1"), Port: 22},
	}
}

func TestPublicKeyCallback_AcceptKnownKey(t *testing.T) {
	// Create registry and add a devbox
	reg := registry.New()

	// Generate test keys for the devbox
	devboxSigner, devboxPub, devboxPubBytes, devboxPrivBytes := generateTestKeys(t)

	// Create a secret with the devbox keys
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
			registry.DevboxPublicKeyField:  devboxPubBytes,
			registry.DevboxPrivateKeyField: devboxPrivBytes,
		},
	}

	if err := reg.AddSecret(nil, secret); err != nil {
		t.Fatalf("Failed to add secret to registry: %v", err)
	}

	// Create the PublicKeyCallback
	callback := gateway.NewPublicKeyCallback(reg)

	// Test authentication with the known key
	conn := newMockConnMetadata("testuser")

	perms, err := callback(conn, devboxPub)
	if err != nil {
		t.Fatalf("Expected no error for known key, got: %v", err)
	}

	if perms == nil {
		t.Fatal("Expected permissions to be returned")
	}

	// Verify username is stored
	username, err := gateway.GetUsernameFromPermissions(perms)
	if err != nil {
		t.Fatalf("Failed to get username from permissions: %v", err)
	}

	if username != "testuser" {
		t.Errorf("Expected username 'testuser', got: %s", username)
	}

	// Verify DevboxInfo is stored
	info, err := gateway.GetDevboxInfoFromPermissions(perms)
	if err != nil {
		t.Fatalf("Failed to get devbox info from permissions: %v", err)
	}

	if info.Namespace != "test-ns" {
		t.Errorf("Expected namespace 'test-ns', got: %s", info.Namespace)
	}

	if info.DevboxName != "test-devbox" {
		t.Errorf("Expected devbox name 'test-devbox', got: %s", info.DevboxName)
	}

	// Verify the private key is available
	if info.PrivateKey == nil {
		t.Error("Expected PrivateKey to be set")
	}

	// Verify the private key matches
	if string(info.PrivateKey.PublicKey().Marshal()) != string(devboxSigner.PublicKey().Marshal()) {
		t.Error("Private key mismatch")
	}
}

func TestPublicKeyCallback_RejectUnknownKey(t *testing.T) {
	// Create empty registry
	reg := registry.New()

	// Generate an unknown key
	_, unknownPub, _, _ := generateTestKeys(t)

	// Create the PublicKeyCallback
	callback := gateway.NewPublicKeyCallback(reg)

	// Test authentication with unknown key
	conn := newMockConnMetadata("testuser")

	perms, err := callback(conn, unknownPub)
	if err == nil {
		t.Fatal("Expected error for unknown key, got nil")
	}

	if perms != nil {
		t.Error("Expected nil permissions for unknown key")
	}
}

func TestPublicKeyCallback_MultipleDevboxes(t *testing.T) {
	reg := registry.New()

	// Add multiple devboxes
	devboxes := []struct {
		namespace string
		name      string
	}{
		{"ns1", "devbox1"},
		{"ns1", "devbox2"},
		{"ns2", "devbox1"},
	}

	keys := make(map[string]ssh.PublicKey)

	for _, db := range devboxes {
		_, pub, pubBytes, privBytes := generateTestKeys(t)

		secret := &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "secret-" + db.name,
				Namespace: db.namespace,
				Labels: map[string]string{
					registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
				},
				OwnerReferences: []metav1.OwnerReference{
					{
						Kind: registry.DevboxOwnerKind,
						Name: db.name,
					},
				},
			},
			Data: map[string][]byte{
				registry.DevboxPublicKeyField:  pubBytes,
				registry.DevboxPrivateKeyField: privBytes,
			},
		}

		if err := reg.AddSecret(nil, secret); err != nil {
			t.Fatalf("Failed to add secret for %s/%s: %v", db.namespace, db.name, err)
		}

		keys[db.namespace+"/"+db.name] = pub
	}

	// Test that each key is accepted and maps to the correct devbox
	callback := gateway.NewPublicKeyCallback(reg)

	for _, db := range devboxes {
		key := keys[db.namespace+"/"+db.name]
		conn := newMockConnMetadata("user")

		perms, err := callback(conn, key)
		if err != nil {
			t.Errorf("Failed to authenticate with key for %s/%s: %v", db.namespace, db.name, err)
			continue
		}

		info, err := gateway.GetDevboxInfoFromPermissions(perms)
		if err != nil {
			t.Errorf("Failed to get devbox info for %s/%s: %v", db.namespace, db.name, err)
			continue
		}

		if info.Namespace != db.namespace || info.DevboxName != db.name {
			t.Errorf("Expected %s/%s, got %s/%s",
				db.namespace, db.name, info.Namespace, info.DevboxName)
		}
	}
}

// TestHandleConnection_Basic is a basic sanity check that HandleConnection can be called
// Full integration testing would require setting up a complete SSH server and backend.
// The authentication logic is thoroughly tested in the PublicKeyCallback tests above.
func TestHandleConnection_Basic(t *testing.T) {
	// This test verifies that HandleConnection can be called without panicking
	// when given an invalid connection. Real end-to-end testing would require
	// a full SSH server setup with backend pods.
	reg := registry.New()
	hostKey, _, _, _ := generateTestKeys(t)
	gw := gateway.New(hostKey, reg)

	// Create a connection that will immediately fail
	clientConn, serverConn := net.Pipe()
	clientConn.Close() // Close immediately to cause handshake failure

	// This should return quickly with a handshake error (not panic)
	done := make(chan bool, 1)
	go func() {
		gw.HandleConnection(serverConn)

		done <- true
	}()

	select {
	case <-done:
		// Expected: HandleConnection returned due to handshake failure
	case <-time.After(1 * time.Second):
		t.Fatal("HandleConnection did not return in time")
	}
}

func TestPublicKeyCallback_DifferentUsernames(t *testing.T) {
	reg := registry.New()

	_, pub, pubBytes, privBytes := generateTestKeys(t)

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

	if err := reg.AddSecret(nil, secret); err != nil {
		t.Fatalf("Failed to add secret: %v", err)
	}

	callback := gateway.NewPublicKeyCallback(reg)

	// Test that the same key works with different usernames
	usernames := []string{"root", "user1", "admin", "developer"}

	for _, username := range usernames {
		conn := newMockConnMetadata(username)

		perms, err := callback(conn, pub)
		if err != nil {
			t.Errorf("Failed to authenticate as %s: %v", username, err)
			continue
		}

		actualUsername, err := gateway.GetUsernameFromPermissions(perms)
		if err != nil {
			t.Errorf("Failed to get username from permissions: %v", err)
			continue
		}

		if actualUsername != username {
			t.Errorf("Expected username %s, got: %s", username, actualUsername)
		}
	}
}

func TestGetDevboxInfoFromPermissions(t *testing.T) {
	reg := registry.New()
	_, pub, pubBytes, privBytes := generateTestKeys(t)

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

	if err := reg.AddSecret(nil, secret); err != nil {
		t.Fatalf("Failed to add secret: %v", err)
	}

	callback := gateway.NewPublicKeyCallback(reg)
	conn := newMockConnMetadata("testuser")

	t.Run("ValidPermissions", func(t *testing.T) {
		perms, err := callback(conn, pub)
		if err != nil {
			t.Fatalf("Authentication failed: %v", err)
		}

		info, err := gateway.GetDevboxInfoFromPermissions(perms)
		if err != nil {
			t.Fatalf("Failed to get devbox info: %v", err)
		}

		if info.Namespace != "test-ns" {
			t.Errorf("Expected namespace 'test-ns', got: %s", info.Namespace)
		}

		if info.DevboxName != "test-devbox" {
			t.Errorf("Expected devbox name 'test-devbox', got: %s", info.DevboxName)
		}
	})

	t.Run("NilPermissions", func(t *testing.T) {
		_, err := gateway.GetDevboxInfoFromPermissions(nil)
		if err == nil {
			t.Error("Expected error for nil permissions")
		}
	})

	t.Run("MissingDevboxInfo", func(t *testing.T) {
		perms := &ssh.Permissions{
			ExtraData: map[any]any{},
		}

		_, err := gateway.GetDevboxInfoFromPermissions(perms)
		if err == nil {
			t.Error("Expected error for missing devbox_info")
		}
	})

	t.Run("InvalidDevboxInfoType", func(t *testing.T) {
		perms := &ssh.Permissions{
			ExtraData: map[any]any{
				"devbox_info": "invalid",
			},
		}

		_, err := gateway.GetDevboxInfoFromPermissions(perms)
		if err == nil {
			t.Error("Expected error for invalid devbox_info type")
		}
	})
}

func TestGetUsernameFromPermissions(t *testing.T) {
	t.Run("ValidPermissions", func(t *testing.T) {
		perms := &ssh.Permissions{
			Extensions: map[string]string{
				"username": "testuser",
			},
		}

		username, err := gateway.GetUsernameFromPermissions(perms)
		if err != nil {
			t.Fatalf("Failed to get username: %v", err)
		}

		if username != "testuser" {
			t.Errorf("Expected username 'testuser', got: %s", username)
		}
	})

	t.Run("NilPermissions", func(t *testing.T) {
		_, err := gateway.GetUsernameFromPermissions(nil)
		if err == nil {
			t.Error("Expected error for nil permissions")
		}
	})

	t.Run("MissingUsername", func(t *testing.T) {
		perms := &ssh.Permissions{
			Extensions: map[string]string{},
		}

		_, err := gateway.GetUsernameFromPermissions(perms)
		if err == nil {
			t.Error("Expected error for missing username")
		}
	})
}

func TestPublicKeyCallback_WithPodIP(t *testing.T) {
	reg := registry.New()

	_, pub, pubBytes, privBytes := generateTestKeys(t)

	// Add secret first
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

	if err := reg.AddSecret(nil, secret); err != nil {
		t.Fatalf("Failed to add secret: %v", err)
	}

	// Add pod with IP
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

	if err := reg.UpdatePod(pod); err != nil {
		t.Fatalf("Failed to update pod: %v", err)
	}

	// Test authentication
	callback := gateway.NewPublicKeyCallback(reg)
	conn := newMockConnMetadata("testuser")

	perms, err := callback(conn, pub)
	if err != nil {
		t.Fatalf("Authentication failed: %v", err)
	}

	info, err := gateway.GetDevboxInfoFromPermissions(perms)
	if err != nil {
		t.Fatalf("Failed to get devbox info from permissions: %v", err)
	}

	if info.PodIP != "10.0.0.1" {
		t.Errorf("Expected PodIP '10.0.0.1', got: %s", info.PodIP)
	}
}
