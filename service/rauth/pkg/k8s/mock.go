package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// MockClient is a mock implementation of ClientInterface for testing without Kubernetes
type MockClient struct {
	credentials map[string]*RegistryCredentials
	mu          sync.RWMutex
}

// MockCredentialsConfig represents the configuration for mock credentials
type MockCredentialsConfig struct {
	Namespaces map[string]NamespaceCredentials `json:"namespaces"`
}

// NamespaceCredentials represents credentials for a single namespace
type NamespaceCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// NewMockClient creates a new mock client with the given credentials
func NewMockClient(credentials map[string]*RegistryCredentials) *MockClient {
	if credentials == nil {
		credentials = make(map[string]*RegistryCredentials)
	}

	return &MockClient{
		credentials: credentials,
	}
}

// NewMockClientFromConfig creates a mock client from a JSON config file
func NewMockClientFromConfig(configPath string) (*MockClient, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read mock config file: %w", err)
	}

	var config MockCredentialsConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse mock config: %w", err)
	}

	credentials := make(map[string]*RegistryCredentials)
	for ns, creds := range config.Namespaces {
		credentials[ns] = &RegistryCredentials{
			Username: creds.Username,
			Password: creds.Password,
		}
	}

	return NewMockClient(credentials), nil
}

// NewMockClientFromEnv creates a mock client from environment variables
// Format: MOCK_CREDS_<NAMESPACE>=<username>:<password>
// Example: MOCK_CREDS_TEAM_A=team-a:secret123
func NewMockClientFromEnv() *MockClient {
	credentials := make(map[string]*RegistryCredentials)

	// Check for JSON config in env
	if configJSON := os.Getenv("MOCK_CREDENTIALS"); configJSON != "" {
		var config MockCredentialsConfig
		if err := json.Unmarshal([]byte(configJSON), &config); err == nil {
			for ns, creds := range config.Namespaces {
				credentials[ns] = &RegistryCredentials{
					Username: creds.Username,
					Password: creds.Password,
				}
			}
		}
	}

	return NewMockClient(credentials)
}

// GetNamespaceCredentials retrieves credentials for a namespace from the mock store
func (m *MockClient) GetNamespaceCredentials(
	ctx context.Context,
	namespace string,
) (*RegistryCredentials, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	creds, ok := m.credentials[namespace]
	if !ok {
		return nil, fmt.Errorf("secret %s not found in namespace %s", DefaultSecretName, namespace)
	}

	return creds, nil
}

// NamespaceExists checks if a namespace exists in the mock store
func (m *MockClient) NamespaceExists(ctx context.Context, namespace string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, ok := m.credentials[namespace]

	return ok, nil
}

// AddCredentials adds credentials for a namespace (useful for testing)
func (m *MockClient) AddCredentials(namespace, username, password string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.credentials[namespace] = &RegistryCredentials{
		Username: username,
		Password: password,
	}
}

// RemoveCredentials removes credentials for a namespace
func (m *MockClient) RemoveCredentials(namespace string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.credentials, namespace)
}
