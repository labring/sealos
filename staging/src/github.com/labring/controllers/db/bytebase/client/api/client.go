// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package api

import (
	"context"
)

// Client is the API message for Bytebase OpenAPI client.
type Client interface {
	// Auth
	// Login will login the user and get the response.
	Login(*AuthRequest) (int, error)
	// Signup will register the user
	Signup(*CreateUserRequest) (int, error)
	// GetLoginCookie get the inside login cookie.
	GetLoginCookie() LoginCookie

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
