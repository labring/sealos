package api

import (
	"context"
	"net/http"
)

// Client is the API message for Bytebase OpenAPI client.
type Client interface {
	// Auth
	// Login will login the user and get the response.
	Login(*AuthRequest) (int, error)
	// Signup will register the user
	Signup(*CreateUserRequest) (int, error)
	GetHeaders() (http.Header, error)

	// Environment
	// CreateEnvironment creates the environment.
	CreateEnvironment(ctx context.Context, environmentID string, create *EnvironmentMessage) (*EnvironmentMessage, error)
	// GetEnvironment gets the environment by id.
	GetEnvironment(ctx context.Context, environmentID string) (*EnvironmentMessage, error)

	// Instance
	// ListInstance will return instances in environment.
	GetInstance(ctx context.Context, find *InstanceFindMessage) (*InstanceMessage, error)
	// CreateInstance creates the instance.
	CreateInstance(ctx context.Context, environmentID, instanceID string, instance *InstanceMessage) (*InstanceMessage, error)
}
