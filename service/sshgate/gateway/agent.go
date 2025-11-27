package gateway

import (
	"fmt"
	"time"

	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

func (g *Gateway) handleAgentForwardMode(
	newChannel ssh.NewChannel,
	ctx *sessionContext,
) {
	sessionLogger := ctx.logger.WithField("mode", "agent_forwarding")

	channel, requests, err := newChannel.Accept()
	if err != nil {
		sessionLogger.WithError(err).Error("Failed to accept session channel")
		return
	}
	defer channel.Close()

	// Process channel requests to handle auth-agent-req@openssh.com
	// This implements the OpenSSH standard where auth-agent-req is a CHANNEL request
	// Returns agent channel and cached requests
	sessionResult := g.handleSessionRequests(requests, ctx)

	// Check if agent forwarding was successful
	if sessionResult == nil || sessionResult.AgentChannel == nil {
		sessionLogger.Warn("Failed to establish agent forwarding")
		fmt.Fprintf(channel,
			"Failed to establish agent forwarding\r\n"+
				"Make sure your SSH agent is running and has the correct keys\r\n",
		)

		return
	}

	// Connect to backend with agent authentication if available
	backendConn, err := g.connectToBackend(ctx, sessionResult.AgentChannel)
	// close agent channel
	_ = sessionResult.AgentChannel.Close()

	if err != nil {
		sessionLogger.WithError(err).Error("Failed to connect to backend")
		fmt.Fprintf(channel,
			"Failed to connect to devbox: %v\r\n"+
				"Make sure your SSH agent has the correct key and that the key is in ~/.ssh/authorized_keys on the devbox\r\n",
			err,
		)

		return
	}

	defer backendConn.Close()

	sessionLogger.Info("Backend connected via agent forwarding")

	backendChannel, backendRequests, err := backendConn.OpenChannel("session", nil)
	if err != nil {
		sessionLogger.WithError(err).Error("Failed to open backend channel")
		return
	}
	defer backendChannel.Close()

	// Forward cached requests to backend
	g.forwardCachedRequests(sessionResult.CachedRequests, backendChannel, sessionLogger)

	// Use synchronized proxy to ensure exit-status is forwarded before closing
	g.proxyChannelWithRequests(channel, backendChannel, requests, backendRequests)
}

// forwardCachedRequests forwards cached SSH requests to the backend
func (g *Gateway) forwardCachedRequests(
	cachedRequests []*ssh.Request,
	backendChannel ssh.Channel,
	logger *log.Entry,
) {
	for _, req := range cachedRequests {
		ok, err := backendChannel.SendRequest(req.Type, req.WantReply, req.Payload)
		if err != nil {
			logger.WithField("request_type", req.Type).
				WithError(err).
				Warn("Failed to forward cached request")
		}

		if req.WantReply {
			_ = req.Reply(ok, nil)
		}
	}
}

// SessionRequestsResult contains the results of processing session requests
type SessionRequestsResult struct {
	AgentChannel   ssh.Channel    // Agent channel to client (nil if not requested/failed)
	CachedRequests []*ssh.Request // Cached non-agent requests (max 6)
}

// handleSessionRequests processes channel requests for a session
// This handles auth-agent-req@openssh.com as a CHANNEL request (OpenSSH standard)
// Returns a result with agent request status and cached non-agent requests
func (g *Gateway) handleSessionRequests(
	requests <-chan *ssh.Request,
	ctx *sessionContext,
) *SessionRequestsResult {
	result := &SessionRequestsResult{
		AgentChannel:   nil,
		CachedRequests: make([]*ssh.Request, 0, g.options.MaxCachedRequests),
	}

	// Process requests until we've handled all initial setup requests
	timeout := time.NewTimer(g.options.SessionRequestTimeout)
	defer timeout.Stop()

	for {
		select {
		case req, ok := <-requests:
			if !ok {
				return result
			}

			ctx.logger.WithFields(log.Fields{
				"request_type": req.Type,
				"want_reply":   req.WantReply,
			}).Debug("Session channel request")

			// Handle auth-agent-req@openssh.com as a channel request (OpenSSH standard)
			if req.Type == "auth-agent-req@openssh.com" {
				ctx.logger.Info("Agent forwarding requested by client")

				if req.WantReply {
					_ = req.Reply(true, nil)
				}

				// CRITICAL: In bastion host mode, we need to actively create
				// an agent channel to the client immediately!
				result.AgentChannel = g.createAgentChannelToClient(ctx)

				result.CachedRequests = append(result.CachedRequests, req)

				// Don't forward this request to backend - we handle it
				return result
			}

			// For all other request types, cache them for forwarding
			if len(result.CachedRequests) < g.options.MaxCachedRequests {
				result.CachedRequests = append(result.CachedRequests, req)

				timeout.Reset(time.Second)
				continue
			}

			return nil

		case <-timeout.C:
			// Timeout - stop processing initial requests
			return result
		}
	}
}

// createAgentChannelToClient actively creates an agent channel to the client
// This is the critical function for bastion host SSH agent forwarding
// Returns the created agent channel or nil if failed
func (g *Gateway) createAgentChannelToClient(ctx *sessionContext) ssh.Channel {
	// Use the client connection to open an agent channel
	// This tells the client "I want to access your SSH agent"
	agentChannel, agentReqs, err := ctx.conn.OpenChannel("auth-agent@openssh.com", nil)
	if err != nil {
		ctx.logger.WithError(err).Error("Failed to open agent channel to client")
		return nil
	}

	ctx.logger.Info("Agent channel to client established")

	// Discard requests on the agent channel
	go ssh.DiscardRequests(agentReqs)

	return agentChannel
}

func (g *Gateway) connectToBackend(
	ctx *sessionContext,
	agentChannel ssh.Channel,
) (*ssh.Client, error) {
	backendAddr := fmt.Sprintf("%s:%d", ctx.info.PodIP, g.options.SSHBackendPort)

	agentClient := agent.NewClient(agentChannel)

	backendConfig := &ssh.ClientConfig{
		User: ctx.realUser,
		Auth: []ssh.AuthMethod{ssh.PublicKeysCallback(agentClient.Signers)},
		//nolint:gosec
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         g.options.BackendConnectTimeoutAgent,
	}

	ctx.logger.WithFields(log.Fields{
		"backend_addr": backendAddr,
		"backend_user": ctx.realUser,
	}).Info("Connecting to backend with agent authentication")

	conn, err := ssh.Dial("tcp", backendAddr, backendConfig)
	if err != nil {
		return nil, err
	}

	return conn, nil
}
