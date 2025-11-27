package gateway_test

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/labring/sealos/service/sshgate/gateway"
	"github.com/labring/sealos/service/sshgate/registry"
	"golang.org/x/crypto/ssh"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TestExitStatusForwarding tests that exit-status is reliably forwarded
// from the backend to the client before the channel is closed.
// This is a regression test for the race condition where the gateway
// would close the client channel before forwarding the exit-status.
func TestExitStatusForwarding(t *testing.T) {
	// Setup: Create a gateway with a mock backend
	reg := registry.New()
	hostKey, _, pubBytes, privBytes := generateTestKeys(t)

	// Create and register a devbox secret
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: registry.DevboxOwnerKind, Name: "test-devbox"},
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

	// Start a mock backend SSH server that returns a specific exit code
	var lc net.ListenConfig

	backendListener, err := lc.Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start backend listener: %v", err)
	}
	defer backendListener.Close()

	backendAddr := backendListener.Addr().String()
	_, backendPort, _ := net.SplitHostPort(backendAddr)

	// Update registry with pod IP pointing to our mock backend
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: registry.DevboxOwnerKind, Name: "test-devbox"},
			},
		},
		Status: corev1.PodStatus{
			PodIP: "127.0.0.1",
		},
	}
	if err := reg.UpdatePod(pod); err != nil {
		t.Fatalf("Failed to update pod: %v", err)
	}

	// Create gateway with custom backend port
	gw := gateway.New(hostKey, reg,
		gateway.WithSSHBackendPort(mustAtoi(t, backendPort)),
		gateway.WithSSHHandshakeTimeout(5*time.Second),
		gateway.WithBackendConnectTimeouts(5*time.Second, 5*time.Second),
	)

	// Start the gateway listener
	gwListener, err := lc.Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start gateway listener: %v", err)
	}
	defer gwListener.Close()

	// Run the mock backend server
	backendKey, _, _, _ := generateTestKeys(t)
	go runMockBackendServer(t, backendListener, backendKey, privBytes, 42)

	// Run gateway accept loop
	go func() {
		for {
			conn, err := gwListener.Accept()
			if err != nil {
				return
			}

			go gw.HandleConnection(conn)
		}
	}()

	// Run the test multiple times sequentially to catch race conditions
	const numRuns = 5

	for i := 1; i <= numRuns; i++ {
		exitCode, err := runSSHCommand(t, gwListener.Addr().String(), privBytes, "exit 42")
		if err != nil {
			t.Fatalf("Run %d: SSH error: %v", i, err)
		}

		if exitCode != 42 {
			t.Errorf("Run %d: Expected exit code 42, got %d", i, exitCode)
		}
	}
}

// TestExitStatusForwardingSequential runs exit status tests sequentially
// to isolate timing issues
func TestExitStatusForwardingSequential(t *testing.T) {
	reg := registry.New()
	hostKey, _, pubBytes, privBytes := generateTestKeys(t)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: registry.DevboxOwnerKind, Name: "test-devbox"},
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

	var lc net.ListenConfig

	backendListener, err := lc.Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start backend listener: %v", err)
	}
	defer backendListener.Close()

	backendAddr := backendListener.Addr().String()
	_, backendPort, _ := net.SplitHostPort(backendAddr)

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "test-ns",
			Labels: map[string]string{
				registry.DevboxPartOfLabel: registry.DevboxPartOfValue,
			},
			OwnerReferences: []metav1.OwnerReference{
				{Kind: registry.DevboxOwnerKind, Name: "test-devbox"},
			},
		},
		Status: corev1.PodStatus{
			PodIP: "127.0.0.1",
		},
	}
	if err := reg.UpdatePod(pod); err != nil {
		t.Fatalf("Failed to update pod: %v", err)
	}

	gw := gateway.New(hostKey, reg,
		gateway.WithSSHBackendPort(mustAtoi(t, backendPort)),
		gateway.WithSSHHandshakeTimeout(5*time.Second),
		gateway.WithBackendConnectTimeouts(5*time.Second, 5*time.Second),
	)

	gwListener, err := lc.Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start gateway listener: %v", err)
	}
	defer gwListener.Close()

	backendKey, _, _, _ := generateTestKeys(t)
	go runMockBackendServer(t, backendListener, backendKey, privBytes, 42)

	go func() {
		for {
			conn, err := gwListener.Accept()
			if err != nil {
				return
			}

			go gw.HandleConnection(conn)
		}
	}()

	// Test different exit codes sequentially
	testCases := []int{0, 1, 42, 127, 255}

	for _, expectedCode := range testCases {
		exitCode, err := runSSHCommand(
			t,
			gwListener.Addr().String(),
			privBytes,
			fmt.Sprintf("exit %d", expectedCode),
		)
		if err != nil {
			t.Fatalf("SSH command (exit %d) failed: %v", expectedCode, err)
		}

		if exitCode != expectedCode {
			t.Errorf("Expected exit code %d, got %d", expectedCode, exitCode)
		}
	}
}

// runMockBackendServer runs a simple SSH server that accepts connections
// and returns the specified exit code for any command
func runMockBackendServer(
	t *testing.T,
	listener net.Listener,
	hostKey ssh.Signer,
	authorizedKey []byte,
	defaultExitCode int,
) {
	t.Helper()

	// Parse the authorized public key
	authorizedPubKey, _, _, _, err := ssh.ParseAuthorizedKey(authorizedKey)
	if err != nil {
		// Try parsing as private key and extract public key
		signer, parseErr := ssh.ParsePrivateKey(authorizedKey)
		if parseErr != nil {
			t.Logf("Failed to parse authorized key: %v", parseErr)
			return
		}

		authorizedPubKey = signer.PublicKey()
	}

	config := &ssh.ServerConfig{
		PublicKeyCallback: func(_ ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
			if string(key.Marshal()) == string(authorizedPubKey.Marshal()) {
				return &ssh.Permissions{}, nil
			}

			return nil, errors.New("unknown public key")
		},
	}
	config.AddHostKey(hostKey)

	for {
		conn, err := listener.Accept()
		if err != nil {
			return
		}

		go handleMockBackendConnection(conn, config, defaultExitCode)
	}
}

func handleMockBackendConnection(conn net.Conn, config *ssh.ServerConfig, exitCode int) {
	defer conn.Close()

	sshConn, chans, reqs, err := ssh.NewServerConn(conn, config)
	if err != nil {
		return
	}
	defer sshConn.Close()

	go ssh.DiscardRequests(reqs)

	for newChannel := range chans {
		if newChannel.ChannelType() != "session" {
			_ = newChannel.Reject(ssh.UnknownChannelType, "unknown channel type")
			continue
		}

		channel, requests, err := newChannel.Accept()
		if err != nil {
			continue
		}

		go func(ch ssh.Channel, reqs <-chan *ssh.Request) {
			defer ch.Close()

			for req := range reqs {
				switch req.Type {
				case "exec", "shell":
					if req.WantReply {
						_ = req.Reply(true, nil)
					}

					// Parse exit code from exec command if present
					actualExitCode := exitCode
					if req.Type == "exec" && len(req.Payload) > 4 {
						cmdLen := binary.BigEndian.Uint32(req.Payload[:4])
						if int(cmdLen) <= len(req.Payload)-4 {
							cmd := string(req.Payload[4 : 4+cmdLen])

							var parsedCode int
							if _, err := fmt.Sscanf(cmd, "exit %d", &parsedCode); err == nil {
								actualExitCode = parsedCode
							}
						}
					}

					payload := make([]byte, 4)
					//nolint:gosec // exit code is always 0-255 in tests
					binary.BigEndian.PutUint32(payload, uint32(actualExitCode))
					_, _ = ch.SendRequest("exit-status", false, payload)

					// Send EOF after exit-status
					_ = ch.CloseWrite()

					return

				case "pty-req", "env":
					if req.WantReply {
						_ = req.Reply(true, nil)
					}

				default:
					if req.WantReply {
						_ = req.Reply(false, nil)
					}
				}
			}
		}(channel, requests)
	}
}

// runSSHCommand connects to the gateway and runs a command, returning the exit code
func runSSHCommand(t *testing.T, addr string, privateKey []byte, command string) (int, error) {
	t.Helper()

	signer, err := ssh.ParsePrivateKey(privateKey)
	if err != nil {
		return -1, fmt.Errorf("failed to parse private key: %w", err)
	}

	config := &ssh.ClientConfig{
		User: "testuser",
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		//nolint:gosec // acceptable for testing
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         5 * time.Second,
	}

	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return -1, fmt.Errorf("failed to dial: %w", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return -1, fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	// Request PTY to simulate interactive session
	if err := session.RequestPty("xterm", 80, 40, ssh.TerminalModes{}); err != nil {
		return -1, fmt.Errorf("failed to request pty: %w", err)
	}

	err = session.Run(command)
	if err != nil {
		exitErr := &ssh.ExitError{}
		if errors.As(err, &exitErr) {
			return exitErr.ExitStatus(), nil
		}

		return -1, err
	}

	return 0, nil
}

func mustAtoi(t *testing.T, s string) int {
	t.Helper()

	var n int

	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil {
		t.Fatalf("Failed to parse int: %v", err)
	}

	return n
}
