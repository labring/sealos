package gateway

import (
	"fmt"

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
	backendAddr := fmt.Sprintf("%s:%d", info.PodIP, g.options.SSHBackendPort)

	backendConfig := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(info.PrivateKey),
		},
		//nolint:gosec
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         g.options.BackendConnectTimeoutPublicKey,
	}

	backendConn, err := ssh.Dial("tcp", backendAddr, backendConfig)
	if err != nil {
		logger.WithField("backend_addr", backendAddr).
			WithError(err).
			Error("Failed to connect to backend")
		return
	}
	defer backendConn.Close()

	logger.Info("Backend connected")

	go g.handleGlobalRequestsPublicKey(reqs, backendConn, logger)

	for newChannel := range chans {
		go g.handleChannelPublicKey(newChannel, backendConn, logger)
	}
}

func (g *Gateway) handleGlobalRequestsPublicKey(
	reqs <-chan *ssh.Request,
	backendConn *ssh.Client,
	logger *log.Entry,
) {
	for req := range reqs {
		switch req.Type {
		case "tcpip-forward", "cancel-tcpip-forward":
			if req.WantReply {
				_ = req.Reply(false, nil)
			}

			logger.WithField("request_type", req.Type).Warn("Rejected remote port forwarding")

		default:
			ok, response, err := backendConn.SendRequest(req.Type, req.WantReply, req.Payload)
			if err != nil {
				logger.WithField("request_type", req.Type).
					WithError(err).
					Error("Error forwarding request")

				if req.WantReply {
					_ = req.Reply(false, nil)
				}

				return
			}

			if req.WantReply {
				_ = req.Reply(ok, response)
			}
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
		channelLogger.WithError(err).Warn("Failed to open backend channel")
		_ = newChannel.Reject(ssh.ConnectionFailed, err.Error())
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

	// Use synchronized proxy to ensure exit-status is forwarded before closing
	g.proxyChannelWithRequests(channel, backendChannel, requests, backendReqs)
}
