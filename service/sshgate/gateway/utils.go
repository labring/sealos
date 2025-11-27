package gateway

import (
	"io"
	"net"
	"sync"

	"golang.org/x/crypto/ssh"
)

func (g *Gateway) proxyRequests(in <-chan *ssh.Request, out ssh.Channel) {
	for req := range in {
		ok, err := out.SendRequest(req.Type, req.WantReply, req.Payload)
		if req.WantReply {
			_ = req.Reply(ok, nil)
		}

		if err != nil {
			return
		}
	}
}

// proxyChannelWithRequests proxies data between two SSH channels while also
// forwarding requests. It ensures that exit-status is forwarded before closing.
func (g *Gateway) proxyChannelWithRequests(
	channel, backendChannel ssh.Channel,
	clientReqs, backendReqs <-chan *ssh.Request,
) {
	// Client to backend: requests and data
	go func() {
		g.proxyRequests(clientReqs, backendChannel)
	}()

	go func() {
		_, _ = io.Copy(backendChannel, channel)
		_ = backendChannel.CloseWrite()
	}()

	// Backend to client: wait for both data and requests before CloseWrite
	var backendToClientWg sync.WaitGroup

	backendToClientWg.Go(func() {
		_, _ = io.Copy(channel, backendChannel)
		_ = channel.CloseWrite()
	})

	backendToClientWg.Go(func() {
		g.proxyRequests(backendReqs, channel)
	})

	// Wait for backend->client to complete (data + exit-status)
	backendToClientWg.Wait()
}

// proxyChannelToConn proxies data between an SSH channel and a net.Conn
func (g *Gateway) proxyChannelToConn(channel ssh.Channel, conn net.Conn) {
	var wg sync.WaitGroup
	wg.Go(func() {
		_, _ = io.Copy(channel, conn)
		_ = channel.CloseWrite()
	})

	_, _ = io.Copy(conn, channel)
	_ = conn.Close()

	wg.Wait()

	_ = channel.Close()
}
