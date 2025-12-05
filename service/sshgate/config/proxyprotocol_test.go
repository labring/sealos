package config_test

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"net"
	"testing"
	"time"

	"github.com/labring/sealos/service/sshgate/config"
	proxyproto "github.com/pires/go-proxyproto"
)

// TestProxyProtocolListenerIntegration tests the actual proxy protocol listener
// behavior with ConnPolicy from config.
func TestProxyProtocolListenerIntegration(t *testing.T) {
	tests := []struct {
		name           string
		trustedCIDRs   []string
		skipCIDRs      []string
		sendHeader     bool
		sourceIP       string
		expectedPolicy string // "use", "skip", "reject"
		expectData     bool
	}{
		{
			name:           "NoConfig_WithHeader_UseProxyIP",
			trustedCIDRs:   nil,
			skipCIDRs:      nil,
			sendHeader:     true,
			sourceIP:       "203.0.113.1",
			expectedPolicy: "use",
			expectData:     true,
		},
		{
			name:           "NoConfig_WithoutHeader_UseRealIP",
			trustedCIDRs:   nil,
			skipCIDRs:      nil,
			sendHeader:     false,
			sourceIP:       "",
			expectedPolicy: "use",
			expectData:     true,
		},
		{
			name:           "TrustedCIDR_MatchingIP_UseProxyIP",
			trustedCIDRs:   []string{"127.0.0.0/8"},
			skipCIDRs:      nil,
			sendHeader:     true,
			sourceIP:       "203.0.113.1",
			expectedPolicy: "use",
			expectData:     true,
		},
		{
			name:           "SkipCIDR_MatchingIP_SkipHeader",
			trustedCIDRs:   nil,
			skipCIDRs:      []string{"127.0.0.0/8"},
			sendHeader:     false, // When SKIP, header is not parsed, so we don't send one
			sourceIP:       "",
			expectedPolicy: "skip",
			expectData:     true,
		},
		{
			name:           "SkipCIDR_MatchingIP_NoHeader",
			trustedCIDRs:   nil,
			skipCIDRs:      []string{"127.0.0.0/8"},
			sendHeader:     false,
			sourceIP:       "",
			expectedPolicy: "skip",
			expectData:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := config.NewDefaultConfig()
			cfg.EnableProxyProtocol = true
			cfg.ProxyProtocolTrustedCIDRs = tt.trustedCIDRs
			cfg.ProxyProtocolSkipCIDRs = tt.skipCIDRs

			// Create base listener
			baseListener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				t.Fatalf("Failed to create listener: %v", err)
			}
			defer baseListener.Close()

			// Wrap with proxy protocol
			ppListener := &proxyproto.Listener{
				Listener:          baseListener,
				ConnPolicy:        cfg.ProxyProtocolConnPolicy(),
				ReadHeaderTimeout: 2 * time.Second,
			}
			defer ppListener.Close()

			// Channel to receive server results
			serverResult := make(chan struct {
				remoteAddr string
				data       string
				err        error
			}, 1)

			// Start server
			go func() {
				conn, err := ppListener.Accept()
				if err != nil {
					serverResult <- struct {
						remoteAddr string
						data       string
						err        error
					}{err: err}
					return
				}
				defer conn.Close()

				// Read data
				reader := bufio.NewReader(conn)
				data, err := reader.ReadString('\n')
				serverResult <- struct {
					remoteAddr string
					data       string
					err        error
				}{
					remoteAddr: conn.RemoteAddr().String(),
					data:       data,
					err:        err,
				}
			}()

			// Connect client
			clientConn, err := net.Dial("tcp", baseListener.Addr().String())
			if err != nil {
				t.Fatalf("Failed to connect: %v", err)
			}
			defer clientConn.Close()

			// Send proxy protocol header if needed
			if tt.sendHeader {
				header := &proxyproto.Header{
					Version:           2,
					Command:           proxyproto.PROXY,
					TransportProtocol: proxyproto.TCPv4,
					SourceAddr: &net.TCPAddr{
						IP:   net.ParseIP(tt.sourceIP),
						Port: 12345,
					},
					DestinationAddr: &net.TCPAddr{
						IP:   net.ParseIP("10.0.0.1"),
						Port: 8080,
					},
				}
				_, err = header.WriteTo(clientConn)
				if err != nil {
					t.Fatalf("Failed to write proxy header: %v", err)
				}
			}

			// Send test data
			testData := "hello\n"
			_, err = clientConn.Write([]byte(testData))
			if err != nil {
				t.Fatalf("Failed to write test data: %v", err)
			}

			// Wait for server result
			select {
			case result := <-serverResult:
				if tt.expectData {
					if result.err != nil && !errors.Is(result.err, io.EOF) {
						t.Errorf("Server error: %v", result.err)
					}
					if result.data != testData {
						t.Errorf("Data mismatch: got %q, want %q", result.data, testData)
					}

					// Verify remote address based on policy
					if tt.sendHeader && tt.expectedPolicy == "use" {
						// Should see proxy header source IP
						host, _, _ := net.SplitHostPort(result.remoteAddr)
						if host != tt.sourceIP {
							t.Errorf(
								"RemoteAddr = %s, want source IP %s",
								result.remoteAddr,
								tt.sourceIP,
							)
						}
					}
				}
			case <-time.After(3 * time.Second):
				if tt.expectData {
					t.Error("Timeout waiting for server response")
				}
			}
		})
	}
}

// TestProxyProtocolListenerReject tests that connections from untrusted IPs are rejected
func TestProxyProtocolListenerReject(t *testing.T) {
	cfg := config.NewDefaultConfig()
	cfg.EnableProxyProtocol = true
	// Only trust 10.0.0.0/8, local connections (127.0.0.1) will be rejected
	cfg.ProxyProtocolTrustedCIDRs = []string{"10.0.0.0/8"}
	cfg.ProxyProtocolSkipCIDRs = nil

	// Create base listener
	baseListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to create listener: %v", err)
	}
	defer baseListener.Close()

	// Wrap with proxy protocol
	ppListener := &proxyproto.Listener{
		Listener:          baseListener,
		ConnPolicy:        cfg.ProxyProtocolConnPolicy(),
		ReadHeaderTimeout: 2 * time.Second,
	}
	defer ppListener.Close()

	// Channel to receive server results
	done := make(chan error, 1)

	// Start server - expect the connection to be rejected
	go func() {
		conn, err := ppListener.Accept()
		if err != nil {
			done <- err
			return
		}
		defer conn.Close()

		// Try to read - should fail due to REJECT policy
		buf := make([]byte, 100)
		_, err = conn.Read(buf)
		done <- err
	}()

	// Connect client from 127.0.0.1 (not in trusted CIDR)
	clientConn, err := net.Dial("tcp", baseListener.Addr().String())
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer clientConn.Close()

	// Send proxy protocol header
	header := &proxyproto.Header{
		Version:           2,
		Command:           proxyproto.PROXY,
		TransportProtocol: proxyproto.TCPv4,
		SourceAddr: &net.TCPAddr{
			IP:   net.ParseIP("203.0.113.1"),
			Port: 12345,
		},
		DestinationAddr: &net.TCPAddr{
			IP:   net.ParseIP("10.0.0.1"),
			Port: 8080,
		},
	}
	_, err = header.WriteTo(clientConn)
	if err != nil {
		t.Fatalf("Failed to write proxy header: %v", err)
	}

	// Send some data
	_, _ = clientConn.Write([]byte("test\n"))

	// Wait for server result
	select {
	case err := <-done:
		// We expect an error due to REJECT policy
		if err == nil {
			t.Error("Expected error due to REJECT policy, got nil")
		}
		t.Logf("Got expected error: %v", err)
	case <-time.After(3 * time.Second):
		t.Error("Timeout - connection should have been rejected")
	}
}

// TestProxyProtocolSkipWithHeader tests that when SKIP policy is used,
// proxy protocol headers are treated as regular data (not parsed)
func TestProxyProtocolSkipWithHeader(t *testing.T) {
	cfg := config.NewDefaultConfig()
	cfg.EnableProxyProtocol = true
	cfg.ProxyProtocolTrustedCIDRs = nil
	cfg.ProxyProtocolSkipCIDRs = []string{"127.0.0.0/8"}

	baseListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to create listener: %v", err)
	}
	defer baseListener.Close()

	ppListener := &proxyproto.Listener{
		Listener:          baseListener,
		ConnPolicy:        cfg.ProxyProtocolConnPolicy(),
		ReadHeaderTimeout: 2 * time.Second,
	}
	defer ppListener.Close()

	resultChan := make(chan struct {
		remoteAddr string
		data       []byte
		err        error
	}, 1)

	go func() {
		conn, err := ppListener.Accept()
		if err != nil {
			resultChan <- struct {
				remoteAddr string
				data       []byte
				err        error
			}{err: err}
			return
		}
		defer conn.Close()

		buf := make([]byte, 256)
		n, err := conn.Read(buf)
		resultChan <- struct {
			remoteAddr string
			data       []byte
			err        error
		}{
			remoteAddr: conn.RemoteAddr().String(),
			data:       buf[:n],
			err:        err,
		}
	}()

	clientConn, err := net.Dial("tcp", baseListener.Addr().String())
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer clientConn.Close()

	// Send proxy protocol header - but it will be treated as data due to SKIP
	header := &proxyproto.Header{
		Version:           2,
		Command:           proxyproto.PROXY,
		TransportProtocol: proxyproto.TCPv4,
		SourceAddr:        &net.TCPAddr{IP: net.ParseIP("203.0.113.1"), Port: 12345},
		DestinationAddr:   &net.TCPAddr{IP: net.ParseIP("10.0.0.1"), Port: 8080},
	}
	_, err = header.WriteTo(clientConn)
	if err != nil {
		t.Fatalf("Failed to write proxy header: %v", err)
	}

	select {
	case result := <-resultChan:
		if result.err != nil {
			t.Fatalf("Server error: %v", result.err)
		}

		// With SKIP, the header is not parsed, so it appears as raw data
		// The data should start with the proxy protocol v2 signature
		proxyV2Sig := []byte{0x0D, 0x0A, 0x0D, 0x0A, 0x00, 0x0D, 0x0A, 0x51, 0x55, 0x49, 0x54, 0x0A}
		if len(result.data) < len(proxyV2Sig) {
			t.Fatalf("Data too short: got %d bytes", len(result.data))
		}

		for i, b := range proxyV2Sig {
			if result.data[i] != b {
				t.Errorf(
					"Expected proxy v2 signature at byte %d, got %x want %x",
					i,
					result.data[i],
					b,
				)
			}
		}

		// RemoteAddr should be the real client IP, not the proxy header IP
		host, _, _ := net.SplitHostPort(result.remoteAddr)
		if host != "127.0.0.1" {
			t.Errorf("RemoteAddr = %s, want 127.0.0.1", host)
		}

		t.Logf("SKIP policy correctly treated header as data (%d bytes)", len(result.data))
	case <-time.After(3 * time.Second):
		t.Error("Timeout")
	}
}

// TestProxyProtocolPreservesRealIP tests that SKIP policy preserves the real client IP
func TestProxyProtocolPreservesRealIP(t *testing.T) {
	cfg := config.NewDefaultConfig()
	cfg.EnableProxyProtocol = true
	cfg.ProxyProtocolTrustedCIDRs = nil
	// Skip proxy protocol for local connections
	cfg.ProxyProtocolSkipCIDRs = []string{"127.0.0.0/8"}

	// Create base listener
	baseListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to create listener: %v", err)
	}
	defer baseListener.Close()

	// Wrap with proxy protocol
	ppListener := &proxyproto.Listener{
		Listener:          baseListener,
		ConnPolicy:        cfg.ProxyProtocolConnPolicy(),
		ReadHeaderTimeout: 2 * time.Second,
	}
	defer ppListener.Close()

	resultChan := make(chan string, 1)

	// Start server
	go func() {
		conn, err := ppListener.Accept()
		if err != nil {
			resultChan <- fmt.Sprintf("error: %v", err)
			return
		}
		defer conn.Close()

		// The remote addr should be the real client IP (127.0.0.1), not the proxy header IP
		resultChan <- conn.RemoteAddr().String()
	}()

	// Connect client
	clientConn, err := net.Dial("tcp", baseListener.Addr().String())
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer clientConn.Close()

	// Even though we send a proxy header, it should be ignored due to SKIP policy
	// The header will be treated as regular data
	// For SKIP policy, we typically don't send a header

	// Send some regular data instead
	_, err = clientConn.Write([]byte("hello\n"))
	if err != nil {
		t.Fatalf("Failed to write: %v", err)
	}

	// Wait for result
	select {
	case result := <-resultChan:
		host, _, err := net.SplitHostPort(result)
		if err != nil {
			t.Fatalf("Failed to parse result: %v", err)
		}
		// Should be 127.0.0.1 (the real client IP)
		if host != "127.0.0.1" {
			t.Errorf("RemoteAddr = %s, want 127.0.0.1 (real IP preserved)", host)
		}
	case <-time.After(3 * time.Second):
		t.Error("Timeout waiting for server")
	}
}
