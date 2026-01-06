package gateway

import (
	"errors"
	"io"
	"net"
	"sync"

	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

// logCopyError logs io.Copy errors appropriately
// EOF errors are logged at debug level, other errors at error level
func logCopyError(err error, logger *log.Entry, direction string) {
	if err == nil {
		return
	}
	if errors.Is(err, io.EOF) {
		logger.WithField("direction", direction).Debug("Copy finished with EOF")
	} else {
		logger.WithField("direction", direction).WithError(err).Error("Copy error")
	}
}

func (g *Gateway) proxyRequests(
	in <-chan *ssh.Request,
	out ssh.Channel,
	logger *log.Entry,
) {
	for req := range in {
		ok, err := out.SendRequest(req.Type, req.WantReply, req.Payload)
		if req.WantReply {
			_ = req.Reply(ok, nil)
		}
		if err != nil {
			logger.WithField("request_type", req.Type).
				WithError(err).
				Error("Error forwarding request")

			return
		}
	}
}

// proxyChannelWithRequests proxies data between two SSH channels while also
// forwarding requests. It ensures that exit-status is forwarded before closing.
func (g *Gateway) proxyChannelWithRequests(
	channel, backendChannel ssh.Channel,
	clientReqs, backendReqs <-chan *ssh.Request,
	logger *log.Entry,
) {
	// Client to backend: requests and data
	SafeGo(logger, func() {
		g.proxyRequests(clientReqs, backendChannel, logger)
	})

	SafeGo(logger, func() {
		_, err := io.Copy(backendChannel, channel)
		logCopyError(err, logger, "client->backend")
		_ = backendChannel.CloseWrite()
	})

	// Backend to client: wait for both data and requests before CloseWrite
	var backendToClientWg sync.WaitGroup

	backendToClientWg.Go(func() {
		defer recoverWithLogger(logger)
		_, err := io.Copy(channel, backendChannel)
		logCopyError(err, logger, "backend->client")
		_ = channel.CloseWrite()
	})

	backendToClientWg.Go(func() {
		defer recoverWithLogger(logger)
		g.proxyRequests(backendReqs, channel, logger)
	})

	// Wait for backend->client to complete (data + exit-status)
	backendToClientWg.Wait()
}

// proxyChannelToConn proxies data between an SSH channel and a net.Conn
func (g *Gateway) proxyChannelToConn(channel ssh.Channel, conn net.Conn, logger *log.Entry) {
	var wg sync.WaitGroup
	wg.Go(func() {
		defer recoverWithLogger(logger)
		_, err := io.Copy(channel, conn)
		logCopyError(err, logger, "conn->channel")
		_ = channel.CloseWrite()
	})

	_, err := io.Copy(conn, channel)
	logCopyError(err, logger, "channel->conn")
	_ = conn.Close()

	wg.Wait()

	_ = channel.Close()
}
