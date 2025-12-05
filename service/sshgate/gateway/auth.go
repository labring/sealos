package gateway

import (
	"errors"

	"github.com/labring/sealos/service/sshgate/registry"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

// AuthMode represents the authentication mode
type AuthMode int

const (
	AuthModeUnknown   AuthMode = iota
	AuthModePublicKey          // Public key authentication mode
	AuthModeCustomKey          // Custom key authentication mode (user-defined public keys)
	AuthModeNoAuth             // No client authentication mode
)

func (m AuthMode) String() string {
	switch m {
	case AuthModePublicKey:
		return "public-key"
	case AuthModeCustomKey:
		return "custom-key"
	case AuthModeNoAuth:
		return "no-auth"
	default:
		return "unknown"
	}
}

// publicKeyCallback handles public key authentication
func (g *Gateway) PublicKeyCallback(
	conn ssh.ConnMetadata,
	key ssh.PublicKey,
) (*ssh.Permissions, error) {
	username := conn.User()

	// Create auth logger with base fields
	authLogger := g.logger.WithFields(log.Fields{
		"auth_type":   "public_key",
		"remote_addr": conn.RemoteAddr().String(),
		"user":        username,
	})

	authLogger.Info("authentication attempt")

	// Look up devbox by public key
	info, ok := g.registry.GetByPublicKey(key)
	if !ok {
		// Parse username: username@short_user_namespace-devboxname
		username, fullNamespace, devboxName, err := g.parser.Parse(conn.User())
		if err != nil {
			return nil, err
		}

		// Update logger with devbox info for custom key mode
		customKeyLogger := authLogger.WithFields(log.Fields{
			"auth_mode": AuthModeCustomKey.String(),
			"namespace": fullNamespace,
			"devbox":    devboxName,
		})

		info, ok := g.registry.GetDevboxInfo(fullNamespace, devboxName)
		if !ok {
			return nil, errors.New("devbox not found")
		}

		customKeyLogger.Info("authentication accept")

		return &ssh.Permissions{
			Extensions: map[string]string{
				"username":  username,
				"auth_mode": AuthModeCustomKey.String(),
			},
			ExtraData: map[any]any{
				"devbox_info": info,
				"logger":      customKeyLogger,
			},
		}, nil
	}

	// Update logger with matched devbox info
	pkLogger := authLogger.WithFields(log.Fields{
		"namespace": info.Namespace,
		"devbox":    info.DevboxName,
	})

	authLogger.Info("authentication accept")

	return &ssh.Permissions{
		Extensions: map[string]string{
			"username":  username,
			"auth_mode": AuthModePublicKey.String(),
		},
		ExtraData: map[any]any{
			"devbox_info": info,
			"logger":      pkLogger,
		},
	}, nil
}

// NoClientAuthCallback handles no client authentication
// It parses the username to determine which devbox to connect to
func (g *Gateway) NoClientAuthCallback(conn ssh.ConnMetadata) (*ssh.Permissions, error) {
	username := conn.User()

	// Create auth logger with base fields
	authLogger := g.logger.WithFields(log.Fields{
		"auth_type":   "no_auth",
		"remote_addr": conn.RemoteAddr().String(),
		"user":        username,
	})

	authLogger.Info("authentication attempt")

	// Parse username: username@short_user_namespace-devboxname
	parsedUsername, fullNamespace, devboxName, err := g.parser.Parse(username)
	if err != nil {
		return nil, err
	}

	// Update logger with devbox info
	noAuthLogger := authLogger.WithFields(log.Fields{
		"namespace": fullNamespace,
		"devbox":    devboxName,
	})

	noAuthLogger.Info("authentication accept")

	// Get devbox info
	info, ok := g.registry.GetDevboxInfo(fullNamespace, devboxName)
	if !ok {
		return nil, errors.New("devbox not found")
	}

	return &ssh.Permissions{
		Extensions: map[string]string{
			"username":  parsedUsername,
			"auth_mode": AuthModeNoAuth.String(),
		},
		ExtraData: map[any]any{
			"devbox_info": info,
			"logger":      noAuthLogger,
		},
	}, nil
}

// determineAuthMode determines which authentication mode is being used
func (g *Gateway) determineAuthMode(conn *ssh.ServerConn) AuthMode {
	if conn.Permissions == nil {
		return AuthModeNoAuth
	}

	authMode := conn.Permissions.Extensions["auth_mode"]
	switch authMode {
	case AuthModePublicKey.String():
		return AuthModePublicKey
	case AuthModeNoAuth.String():
		return AuthModeNoAuth
	default:
		return AuthModeCustomKey
	}
}

func (g *Gateway) getDevboxInfoFromPermissions(
	perms *ssh.Permissions,
) (*registry.DevboxInfo, error) {
	if perms == nil {
		return nil, errors.New("permissions is nil")
	}

	infoValue, ok := perms.ExtraData["devbox_info"]
	if !ok {
		return nil, errors.New("no devbox_info in permissions")
	}

	info, ok := infoValue.(*registry.DevboxInfo)
	if !ok || info == nil {
		return nil, errors.New("invalid devbox_info type")
	}

	return info, nil
}

// GetDevboxInfoFromPermissions is exported for testing
func GetDevboxInfoFromPermissions(perms *ssh.Permissions) (*registry.DevboxInfo, error) {
	gw := &Gateway{}
	return gw.getDevboxInfoFromPermissions(perms)
}

// GetUsernameFromPermissions is exported for testing
func GetUsernameFromPermissions(perms *ssh.Permissions) (string, error) {
	if perms == nil {
		return "", errors.New("permissions is nil")
	}

	username, ok := perms.Extensions["username"]
	if !ok {
		return "", errors.New("no username in permissions")
	}

	return username, nil
}

// NewPublicKeyCallback creates a public key callback for testing
func NewPublicKeyCallback(
	reg *registry.Registry,
) func(ssh.ConnMetadata, ssh.PublicKey) (*ssh.Permissions, error) {
	gw := &Gateway{
		registry: reg,
		parser:   &UsernameParser{},
		logger:   log.WithField("component", "gateway"),
	}

	return gw.PublicKeyCallback
}
