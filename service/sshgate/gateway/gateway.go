// Package gateway provides SSH gateway functionality with support for
// multiple authentication modes including agent forwarding and proxy jump.
package gateway

import (
	"errors"
	"fmt"
	"io"
	"net"
	"syscall"
	"time"

	"github.com/labring/sealos/service/sshgate/registry"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

// Options holds gateway configuration options
type Options struct {
	SSHHandshakeTimeout            time.Duration `env:"SSH_HANDSHAKE_TIMEOUT"             envDefault:"15s"`
	SSHBackendPort                 int           `env:"SSH_BACKEND_PORT"                  envDefault:"22"`
	BackendConnectTimeoutPublicKey time.Duration `env:"BACKEND_CONNECT_TIMEOUT_PUBLICKEY" envDefault:"10s"`
	BackendConnectTimeoutAgent     time.Duration `env:"BACKEND_CONNECT_TIMEOUT_AGENT"     envDefault:"5s"`
	ProxyJumpTimeout               time.Duration `env:"PROXY_JUMP_TIMEOUT"                envDefault:"5s"`
	SessionRequestTimeout          time.Duration `env:"SESSION_REQUEST_TIMEOUT"           envDefault:"3s"`
	MaxCachedRequests              int           `env:"MAX_CACHED_REQUESTS"               envDefault:"6"`
	EnableAgentForward             bool          `env:"ENABLE_AGENT_FORWARD"              envDefault:"true"`
	EnableProxyJump                bool          `env:"ENABLE_PROXY_JUMP"                 envDefault:"false"`
}

// DefaultOptions returns the default gateway options
func DefaultOptions() Options {
	return Options{
		SSHHandshakeTimeout:            15 * time.Second,
		SSHBackendPort:                 22,
		BackendConnectTimeoutPublicKey: 10 * time.Second,
		BackendConnectTimeoutAgent:     5 * time.Second,
		ProxyJumpTimeout:               5 * time.Second,
		SessionRequestTimeout:          3 * time.Second,
		MaxCachedRequests:              6,
		EnableAgentForward:             true,
		EnableProxyJump:                false,
	}
}

// Option is a functional option for configuring Gateway
type Option func(*Options)

// WithOptions applies pre-configured options
func WithOptions(opts Options) Option {
	return func(o *Options) {
		*o = opts
	}
}

// WithSSHHandshakeTimeout sets the SSH handshake timeout
func WithSSHHandshakeTimeout(timeout time.Duration) Option {
	return func(o *Options) {
		o.SSHHandshakeTimeout = timeout
	}
}

// WithSSHBackendPort sets the SSH backend port
func WithSSHBackendPort(port int) Option {
	return func(o *Options) {
		o.SSHBackendPort = port
	}
}

// WithBackendConnectTimeouts sets the backend connect timeouts
func WithBackendConnectTimeouts(publicKeyTimeout, agentTimeout time.Duration) Option {
	return func(o *Options) {
		o.BackendConnectTimeoutPublicKey = publicKeyTimeout
		o.BackendConnectTimeoutAgent = agentTimeout
	}
}

// WithProxyJumpTimeout sets the proxy jump timeout
func WithProxyJumpTimeout(timeout time.Duration) Option {
	return func(o *Options) {
		o.ProxyJumpTimeout = timeout
	}
}

// WithSessionRequestTimeout sets the session request timeout
func WithSessionRequestTimeout(timeout time.Duration) Option {
	return func(o *Options) {
		o.SessionRequestTimeout = timeout
	}
}

// WithMaxCachedRequests sets the maximum number of cached requests
func WithMaxCachedRequests(maxRequests int) Option {
	return func(o *Options) {
		o.MaxCachedRequests = maxRequests
	}
}

// WithEnableAgentForward sets whether agent forwarding is enabled
func WithEnableAgentForward(enable bool) Option {
	return func(o *Options) {
		o.EnableAgentForward = enable
	}
}

// WithEnableProxyJump sets whether proxy jump is enabled
func WithEnableProxyJump(enable bool) Option {
	return func(o *Options) {
		o.EnableProxyJump = enable
	}
}

// Gateway handles SSH connections and routes them to backend devbox pods
type Gateway struct {
	sshConfig *ssh.ServerConfig
	registry  *registry.Registry
	options   *Options
	parser    *UsernameParser
	logger    *log.Entry
}

// New creates a new Gateway instance with functional options
func New(hostKey ssh.Signer, reg *registry.Registry, opts ...Option) *Gateway {
	// Start with default options
	options := DefaultOptions()

	// Apply functional options
	for _, opt := range opts {
		opt(&options)
	}

	gw := &Gateway{
		registry: reg,
		options:  &options,
		parser:   &UsernameParser{},
		logger:   log.WithField("component", "gateway"),
	}

	sshConfig := &ssh.ServerConfig{
		// Ref: https://www.openssh.org/txt/release-7.2
		// need disable no client auth mode
		// because AddKeysToAgent need use public key auth
		// NoClientAuth: true,
		// NoClientAuthCallback: gw.NoClientAuthCallback,
		PublicKeyCallback: gw.PublicKeyCallback,
	}
	sshConfig.AddHostKey(hostKey)

	gw.sshConfig = sshConfig

	return gw
}

// NewServerConn performs SSH handshake with deadline on the given connection.
// Returns the SSH connection, channels, requests, and any error that occurred.
func (g *Gateway) NewServerConn(
	nConn net.Conn,
) (*ssh.ServerConn, <-chan ssh.NewChannel, <-chan *ssh.Request, error) {
	_ = nConn.SetDeadline(time.Now().Add(g.options.SSHHandshakeTimeout))
	conn, chans, reqs, err := ssh.NewServerConn(nConn, g.sshConfig)
	if err != nil {
		return nil, nil, nil, err
	}
	_ = nConn.SetDeadline(time.Time{})
	return conn, chans, reqs, nil
}

func (g *Gateway) HandleConnection(nConn net.Conn) {
	conn, chans, reqs, err := g.NewServerConn(nConn)
	if err != nil {
		// Check if this is likely a health check probe (LB, k8s, etc.)
		// These probes typically just connect and disconnect without completing SSH handshake
		if IsHealthCheckProbeError(err) {
			g.logger.WithFields(log.Fields{
				"remote_addr": nConn.RemoteAddr().String(),
			}).WithError(err).Debug("SSH handshake failed (likely health check probe)")
		} else {
			g.logger.WithFields(log.Fields{
				"remote_addr": nConn.RemoteAddr().String(),
			}).WithError(err).Warn("SSH handshake failed")
		}
		return
	}
	defer conn.Close()

	info, err := g.getDevboxInfoFromPermissions(conn.Permissions)
	if err != nil {
		g.logger.WithFields(log.Fields{
			"remote_addr": conn.RemoteAddr().String(),
			"user":        conn.User(),
		}).WithError(err).Error("Failed to get devbox info from permissions")

		return
	}

	username := conn.Permissions.Extensions["username"]

	// Determine authentication mode
	authMode := g.determineAuthMode(conn)

	// Extract logger from permissions (created during authentication)
	connLogger := g.getLoggerFromPermissions(conn.Permissions)

	// Fallback: create logger if not found in ExtraData (shouldn't happen normally)
	if connLogger == nil {
		connLogger = g.logger.WithFields(log.Fields{
			"remote_addr": conn.RemoteAddr().String(),
			"ssh_user":    conn.User(),
			"namespace":   info.Namespace,
			"devbox":      info.DevboxName,
			"auth_mode":   authMode.String(),
		})
	}

	// Check if devbox is running
	if info.PodIP == "" {
		connLogger.Warn("Devbox not running")
		// Reject all incoming channels and close connection

		SafeGo(connLogger, func() {
			ssh.DiscardRequests(reqs)
		})

		for newChannel := range chans {
			_ = newChannel.Reject(
				ssh.ConnectionFailed,
				fmt.Sprintf("devbox %s/%s is not running", info.Namespace, info.DevboxName),
			)
		}

		return
	}

	connLogger.Info("Connection established")
	defer connLogger.Info("Connection closed")

	switch authMode {
	case AuthModePublicKey:
		g.handlePublicKeyMode(conn, chans, reqs, info, username, connLogger)
	case AuthModeCustomKey, AuthModeNoAuth:
		g.handleCustomKeyOrNoAuthMode(conn, chans, reqs, info, username, connLogger)
	default:
		connLogger.Warn("Unknown auth mode, closing connection")
	}
}

func (g *Gateway) Config() *ssh.ServerConfig {
	return g.sshConfig
}

// getLoggerFromPermissions extracts the logger from SSH permissions
// Returns the logger if found, otherwise returns nil
func (g *Gateway) getLoggerFromPermissions(perms *ssh.Permissions) *log.Entry {
	if perms == nil || perms.ExtraData == nil {
		return nil
	}

	loggerValue, ok := perms.ExtraData["logger"]
	if !ok {
		return nil
	}

	logger, ok := loggerValue.(*log.Entry)
	if !ok {
		return nil
	}

	return logger
}

// IsHealthCheckProbeError checks if the error is likely from a health check probe.
// Health check probes (LB, k8s, etc.) typically just establish TCP connection
// and close it without sending valid SSH protocol data, causing:
//   - ECONNRESET: connection reset by peer (RST packet)
//   - EPIPE: broken pipe (write to closed connection)
//   - EOF: connection closed gracefully without data
func IsHealthCheckProbeError(err error) bool {
	// Check for EOF (graceful close without SSH data)
	if errors.Is(err, io.EOF) {
		return true
	}

	// Check for network errors
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		// ECONNRESET: connection reset by peer
		// EPIPE: broken pipe
		if errors.Is(opErr.Err, syscall.ECONNRESET) || errors.Is(opErr.Err, syscall.EPIPE) {
			return true
		}
	}
	return false
}
