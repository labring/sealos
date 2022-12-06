package server

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/docker/libtrust"
	yaml "gopkg.in/yaml.v2"
)

type Config struct {
	Server ServerConfig `yaml:"server"`
	Token  TokenConfig  `yaml:"token"`
}

// nolint:revive
type ServerConfig struct {
	ListenAddress string `yaml:"addr,omitempty"`
	PathPrefix    string `yaml:"path_prefix,omitempty"`
}

type TokenConfig struct {
	Issuer     string `yaml:"issuer,omitempty"`
	CertFile   string `yaml:"certificate,omitempty"`
	KeyFile    string `yaml:"key,omitempty"`
	Expiration int64  `yaml:"expiration,omitempty"`

	publicKey  libtrust.PublicKey
	privateKey libtrust.PrivateKey
}

func validate(c *Config) error {
	if c.Server.ListenAddress == "" {
		return errors.New("server.addr is required")
	}
	if c.Server.PathPrefix != "" && !strings.HasPrefix(c.Server.PathPrefix, "/") {
		return errors.New("server.path_prefix must be an absolute path")
	}
	if c.Token.Issuer == "" {
		return errors.New("token.issuer is required")
	}
	if c.Token.Expiration <= 0 {
		return fmt.Errorf("expiration must be positive, got %d", c.Token.Expiration)
	}
	return nil
}

func loadCertAndKey(certFile string, keyFile string) (pk libtrust.PublicKey, prk libtrust.PrivateKey, err error) {
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return
	}
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	if err != nil {
		return
	}
	pk, err = libtrust.FromCryptoPublicKey(x509Cert.PublicKey)
	if err != nil {
		return
	}
	prk, err = libtrust.FromCryptoPrivateKey(cert.PrivateKey)
	return
}

func LoadConfig(fileName string) (*Config, error) {
	contents, err := os.ReadFile(fileName)
	if err != nil {
		return nil, fmt.Errorf("could not read %s: %s", fileName, err)
	}
	c := &Config{}
	if err = yaml.Unmarshal(contents, c); err != nil {
		return nil, fmt.Errorf("could not parse config: %s", err)
	}
	// set default ListenAddress
	if c.Server.ListenAddress == "" {
		c.Server.ListenAddress = ":5001"
	}
	if err = validate(c); err != nil {
		return nil, fmt.Errorf("invalid config: %s", err)
	}
	tokenConfigured := false
	if c.Token.CertFile != "" || c.Token.KeyFile != "" {
		// Check for partial configuration.
		if c.Token.CertFile == "" || c.Token.KeyFile == "" {
			return nil, fmt.Errorf("failed to load token cert and key: both were not provided")
		}
		publicKey, privateKey, err := loadCertAndKey(c.Token.CertFile, c.Token.KeyFile)
		if err != nil {
			return nil, fmt.Errorf("failed to load token cert and key: %s", err)
		}
		c.Token.publicKey, c.Token.privateKey = publicKey, privateKey
		tokenConfigured = true
	}
	if !tokenConfigured {
		return nil, fmt.Errorf("failed to load token cert and key: none provided")
	}
	return c, nil
}
