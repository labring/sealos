package gateway

import (
	"net"
	"strconv"
	"time"

	"github.com/labring/sealos/service/sshgate/registry"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

func (g *Gateway) handlePublicKeyMode(
	_ *ssh.ServerConn,
	chans <-chan ssh.NewChannel,
	reqs <-chan *ssh.Request,
	info *registry.DevboxInfo,
	username string,
	logger *log.Entry,
) {
	devboxAddr := net.JoinHostPort(info.PodIP, strconv.Itoa(g.options.SSHBackendPort))

	backendConfig := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(info.PrivateKey),
		},
		//nolint:gosec
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         g.options.BackendConnectTimeoutPublicKey,
	}

	backendConn, err := ssh.Dial("tcp", devboxAddr, backendConfig)
	if err != nil {
		logger.WithField("devbox_addr", devboxAddr).
			WithError(err).
			Error("Failed to connect to devbox")

		// Reject the first channel with error message so client knows what happened
		// Connection will be closed after return, other channels will fail automatically
		errMsg := "Failed to connect to devbox: " + err.Error() + "\r\n" +
			"The devbox may be starting up or the SSH service is not ready\r\n"
		select {
		case newChannel, ok := <-chans:
			if ok {
				_ = newChannel.Reject(ssh.ConnectionFailed, errMsg)
			}
		case <-time.After(g.options.SessionRequestTimeout):
			logger.Debug("Timeout waiting for channel to reject")
		}

		return
	}
	defer backendConn.Close()

	logger.Info("Devbox connected")
	defer logger.Info("Devbox disconnected")

	SafeGo(logger, func() {
		g.handleGlobalRequestsPublicKey(reqs, backendConn, logger)
	})

	for newChannel := range chans {
		SafeGo(logger, func() {
			g.handleChannelPublicKey(newChannel, backendConn, logger)
		})
	}
}

func (g *Gateway) handleGlobalRequestsPublicKey(
	reqs <-chan *ssh.Request,
	backendConn *ssh.Client,
	logger *log.Entry,
) {
	for req := range reqs {
		ok, response, err := backendConn.SendRequest(req.Type, req.WantReply, req.Payload)
		if req.WantReply {
			_ = req.Reply(ok, response)
		}
		if err != nil {
			logger.WithField("request_type", req.Type).
				WithError(err).
				Error("Error forwarding request")

			return
		}
	}
}

func (g *Gateway) handleChannelPublicKey(
	newChannel ssh.NewChannel,
	backendConn *ssh.Client,
	logger *log.Entry,
) {
	channelLogger := logger.WithField("channel_type", newChannel.ChannelType())

	backendChannel, backendReqs, err := backendConn.OpenChannel(
		newChannel.ChannelType(),
		newChannel.ExtraData(),
	)
	if err != nil {
		channelLogger.WithError(err).Warn("Failed to open devbox channel")
		errMsg := "Failed to open devbox channel: " + err.Error() + "\r\n" +
			"The devbox session may have been terminated\r\n"
		_ = newChannel.Reject(ssh.ConnectionFailed, errMsg)
		return
	}
	defer backendChannel.Close()

	channel, requests, err := newChannel.Accept()
	if err != nil {
		channelLogger.WithError(err).Warn("Failed to accept channel")
		backendChannel.Close()
		return
	}
	defer channel.Close()

	channelLogger.Debug("Channel established")
	defer channelLogger.Debug("Channel closed")

	// Use synchronized proxy to ensure exit-status is forwarded before closing
	g.proxyChannelWithRequests(
		channel,
		backendChannel,
		requests,
		backendReqs,
		channelLogger,
	)
}
