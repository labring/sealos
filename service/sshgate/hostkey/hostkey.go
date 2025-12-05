package hostkey

import (
	"crypto/ed25519"
	"crypto/sha256"
	"fmt"

	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/ssh"
)

var logger = log.WithField("component", "hostkey")

// Load loads or generates a deterministic SSH host key based on seed
func Load(seed string) (ssh.Signer, error) {
	// Generate a deterministic key based on SSH_HOST_KEY_SEED
	// This ensures multiple replicas generate the same key
	return GenerateDeterministicKey(seed)
}

// GenerateDeterministicKey generates a deterministic ed25519 key from a seed string
func GenerateDeterministicKey(seed string) (ssh.Signer, error) {
	// Use SHA256 of seed as the ed25519 seed (32 bytes)
	hash := sha256.Sum256([]byte(seed))

	// Generate ed25519 key from seed
	privateKey := ed25519.NewKeyFromSeed(hash[:])

	signer, err := ssh.NewSignerFromKey(privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create signer: %w", err)
	}

	// Log the public key fingerprint for verification
	publicKey := signer.PublicKey()
	fingerprint := ssh.FingerprintSHA256(publicKey)
	logger.WithField("fingerprint", fingerprint).Info("Host key generated")

	return signer, nil
}

// GetFingerprint returns the SHA256 fingerprint of the host key
func GetFingerprint(signer ssh.Signer) string {
	return ssh.FingerprintSHA256(signer.PublicKey())
}
