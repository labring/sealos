package collector

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"

	"google.golang.org/grpc/credentials"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const (
	HubbleClientCertSecretName = "hubble-relay-client-certs"
	HubbleServerCertSecretName = "hubble-relay-server-certs"
	HubbleSecretNamespace      = "kube-system"
	HubbleTLSServerName        = "hubble.hubble-relay.cilium.io"
	CACertKey                  = "ca.crt"
	ClientCertKey              = "tls.crt"
	ClientKeyKey               = "tls.key"
)

// TLSConfig holds TLS configuration parameters
type TLSConfig struct {
	ClientSecretName string
	ServerSecretName string
	SecretNamespace  string
	ServerName       string
}

// NewDefaultTLSConfig creates a TLS config with default values
func NewDefaultTLSConfig() *TLSConfig {
	return &TLSConfig{
		ClientSecretName: HubbleClientCertSecretName,
		ServerSecretName: HubbleServerCertSecretName,
		SecretNamespace:  HubbleSecretNamespace,
		ServerName:       HubbleTLSServerName,
	}
}

// LoadTLSCredentials loads TLS credentials from Kubernetes Secrets
func LoadTLSCredentials(ctx context.Context, k8sClient kubernetes.Interface, tlsConfig *TLSConfig) (credentials.TransportCredentials, error) {
	clientSecret, err := k8sClient.CoreV1().Secrets(tlsConfig.SecretNamespace).Get(ctx, tlsConfig.ClientSecretName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get client secret %s/%s: %v", tlsConfig.SecretNamespace, tlsConfig.ClientSecretName, err)
	}

	clientCertData, ok := clientSecret.Data[ClientCertKey]
	if !ok {
		return nil, fmt.Errorf("%s not found in client secret", ClientCertKey)
	}

	clientKeyData, ok := clientSecret.Data[ClientKeyKey]
	if !ok {
		return nil, fmt.Errorf("%s not found in client secret", ClientKeyKey)
	}
	serverSecret, err := k8sClient.CoreV1().Secrets(tlsConfig.SecretNamespace).Get(ctx, tlsConfig.ServerSecretName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get server secret %s/%s: %v", tlsConfig.SecretNamespace, tlsConfig.ServerSecretName, err)
	}

	caCertData, ok := serverSecret.Data[CACertKey]
	if !ok {
		return nil, fmt.Errorf("%s not found in server secret", CACertKey)
	}
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCertData) {
		return nil, fmt.Errorf("failed to append CA certificate")
	}
	clientCert, err := tls.X509KeyPair(clientCertData, clientKeyData)
	if err != nil {
		return nil, fmt.Errorf("failed to load client certificate: %v", err)
	}
	config := &tls.Config{
		Certificates: []tls.Certificate{clientCert},
		RootCAs:      caCertPool,
		ServerName:   tlsConfig.ServerName,
		MinVersion:   tls.VersionTLS12,
	}
	return credentials.NewTLS(config), nil
}
