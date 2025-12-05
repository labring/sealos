package gateway

import (
	"github.com/labring/sealos/service/sshgate/registry"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

type sessionContext struct {
	conn     *ssh.ServerConn
	info     *registry.DevboxInfo
	realUser string
	logger   *log.Entry
}

func (g *Gateway) handleCustomKeyOrNoAuthMode(
	conn *ssh.ServerConn,
	chans <-chan ssh.NewChannel,
	reqs <-chan *ssh.Request,
	info *registry.DevboxInfo,
	username string,
	logger *log.Entry,
) {
	ctx := &sessionContext{
		conn:     conn,
		info:     info,
		realUser: username,
		logger: logger.WithFields(log.Fields{
			"namespace": info.Namespace,
			"devbox":    info.DevboxName,
			"user":      username,
		}),
	}

	go ssh.DiscardRequests(reqs)

	for newChannel := range chans {
		g.handleChannelCustomKeyOrNoAuth(newChannel, ctx)
	}
}

func (g *Gateway) handleChannelCustomKeyOrNoAuth(
	newChannel ssh.NewChannel,
	ctx *sessionContext,
) {
	channelType := newChannel.ChannelType()
	ctx.logger.WithField("channel_type", channelType).Info("New channel")

	switch channelType {
	case "session":
		g.handleAgentForwardMode(newChannel, ctx)

	case "direct-tcpip":
		g.handleProxyJumpMode(newChannel, ctx)

	default:
		ctx.logger.WithField("channel_type", channelType).Warn("Rejecting unknown channel type")

		_ = newChannel.Reject(ssh.UnknownChannelType, "unsupported channel type")
	}
}
