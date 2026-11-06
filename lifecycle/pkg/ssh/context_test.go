// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package ssh

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"io"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pkg/sftp"
	cryptossh "golang.org/x/crypto/ssh"
)

func TestContextCancelsSSHHandshake(t *testing.T) {
	listener, err := (&net.ListenConfig{}).Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	accepted := make(chan net.Conn, 1)
	go func() {
		conn, err := listener.Accept()
		if err == nil {
			accepted <- conn
		}
	}()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	client := &Client{
		ClientConfig: &cryptossh.ClientConfig{
			HostKeyCallback: func(string, net.Addr, cryptossh.PublicKey) error {
				return errors.New("unexpected server key during stalled handshake")
			},
		},
		Option: NewOption(),
	}
	done := make(chan error, 1)
	go func() { done <- WithContext(ctx, client).Ping(listener.Addr().String()) }()
	select {
	case conn := <-accepted:
		defer conn.Close()
	case <-time.After(5 * time.Second):
		t.Fatal("client did not connect")
	}
	cancel()
	assertTransportStopped(t, done)
}

func assertTransportStopped(t *testing.T, done <-chan error) {
	t.Helper()
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("canceled transport reported success")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("transport continued after cancellation")
	}
}

type blockedFileWriter struct {
	sftp.FileWriter
	started chan struct{}
	release chan struct{}
}

func (w *blockedFileWriter) Filewrite(request *sftp.Request) (io.WriterAt, error) {
	close(w.started)
	<-w.release
	return w.FileWriter.Filewrite(request)
}

func TestContextCancelsActiveTransport(t *testing.T) {
	for _, operation := range []string{"command", "copy"} {
		t.Run(operation, func(t *testing.T) {
			_, key, err := ed25519.GenerateKey(rand.Reader)
			if err != nil {
				t.Fatal(err)
			}
			signer, err := cryptossh.NewSignerFromKey(key)
			if err != nil {
				t.Fatal(err)
			}
			config := &cryptossh.ServerConfig{NoClientAuth: true}
			config.AddHostKey(signer)
			listener, err := (&net.ListenConfig{}).Listen(
				context.Background(), "tcp", "127.0.0.1:0",
			)
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			started := make(chan struct{})
			release := make(chan struct{})
			defer close(release)
			go func() {
				conn, err := listener.Accept()
				if err != nil {
					return
				}
				defer conn.Close()
				server, channels, requests, err := cryptossh.NewServerConn(conn, config)
				if err != nil {
					return
				}
				defer server.Close()
				go cryptossh.DiscardRequests(requests)
				for incoming := range channels {
					channel, requests, err := incoming.Accept()
					if err != nil {
						return
					}
					for request := range requests {
						_ = request.Reply(true, nil)
						switch request.Type {
						case "exec":
							close(started)
						case "subsystem":
							handlers := sftp.InMemHandler()
							handlers.FilePut = &blockedFileWriter{
								FileWriter: handlers.FilePut, started: started, release: release,
							}
							sftpServer := sftp.NewRequestServer(channel, handlers)
							_ = sftpServer.Serve()
							_ = sftpServer.Close()
						}
					}
				}
			}()
			client := &Client{
				ClientConfig: &cryptossh.ClientConfig{
					User: "root", HostKeyCallback: cryptossh.FixedHostKey(signer.PublicKey()),
				},
				Option: NewOption(),
			}
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			bound := WithContext(ctx, client)
			done := make(chan error, 1)
			source := filepath.Join(t.TempDir(), "source")
			if err := os.WriteFile(source, []byte("payload"), 0o600); err != nil {
				t.Fatal(err)
			}
			go func() {
				if operation == "copy" {
					done <- bound.Copy(listener.Addr().String(), source, "/target")
				} else {
					_, err := bound.Cmd(listener.Addr().String(), "blocked command")
					done <- err
				}
			}()
			select {
			case <-started:
			case err := <-done:
				t.Fatalf("operation failed before reaching server: %v", err)
			case <-time.After(5 * time.Second):
				t.Fatal("operation did not reach server")
			}
			cancel()
			assertTransportStopped(t, done)
		})
	}
}
