package gateway

import (
	"fmt"
	"net"
	"strconv"

	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

// directTCPIPMsg represents the payload for direct-tcpip channel requests
type directTCPIPMsg struct {
	HostToConnect    string
	PortToConnect    uint32
	OriginatorIPAddr string
	OriginatorPort   uint32
}

// handleProxyJumpMode handles SSH proxy jump (direct-tcpip) connections
// It ignores the client's requested destination and forcibly connects to the devbox
func (g *Gateway) handleProxyJumpMode(
	newChannel ssh.NewChannel,
	ctx *sessionContext,
) {
	proxyLogger := ctx.logger.WithField("mode", "proxy_jump")

	// Parse the direct-tcpip payload
	var msg directTCPIPMsg
	if err := ssh.Unmarshal(newChannel.ExtraData(), &msg); err != nil {
		proxyLogger.WithError(err).Error("Failed to parse direct-tcpip payload")

		_ = newChannel.Reject(ssh.ConnectionFailed, "failed to parse request")
		return
	}

	proxyLogger.WithFields(log.Fields{
		"requested_host":  msg.HostToConnect,
		"requested_port":  msg.PortToConnect,
		"originator_ip":   msg.OriginatorIPAddr,
		"originator_port": msg.OriginatorPort,
	}).Info("Client requested proxy jump")

	// Force connection to devbox, ignoring client's requested address
	devboxAddr := net.JoinHostPort(ctx.info.PodIP, strconv.Itoa(g.options.SSHBackendPort))
	proxyLogger.WithField("devbox_addr", devboxAddr).Info("Forcing connection to devbox")

	// Dial to devbox
	//nolint:noctx
	conn, err := net.DialTimeout("tcp", devboxAddr, g.options.ProxyJumpTimeout)
	if err != nil {
		proxyLogger.WithField("devbox_addr", devboxAddr).
			WithError(err).
			Error("Failed to connect to devbox")
		_ = newChannel.Reject(ssh.ConnectionFailed, fmt.Sprintf("failed to connect: %v", err))

		return
	}
	defer conn.Close()

	// Accept the SSH channel
	channel, requests, err := newChannel.Accept()
	if err != nil {
		proxyLogger.WithError(err).Error("Failed to accept channel")
		return
	}
	defer channel.Close()

	// Discard any requests on this channel
	go ssh.DiscardRequests(requests)

	proxyLogger.Info("Tunnel established")

	// Proxy data between client channel and devbox connection
	g.proxyChannelToConn(channel, conn)

	proxyLogger.Info("Tunnel closed")
}
